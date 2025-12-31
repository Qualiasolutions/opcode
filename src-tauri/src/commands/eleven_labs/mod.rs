pub mod cache;
pub mod client;
pub mod types;

use anyhow::Result;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

use crate::commands::agents::get_db_path;
use cache::{AudioCache, AudioCacheDb, CharacterVoiceDb, SettingsDb, VoiceProfileDb};
use client::ElevenLabsClient;
use types::*;

/// Shared state for Eleven Labs client
pub struct ElevenLabsState {
    client: Mutex<Option<ElevenLabsClient>>,
    cache: Mutex<Option<AudioCache>>,
}

impl ElevenLabsState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            cache: Mutex::new(None),
        }
    }
}

impl Default for ElevenLabsState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize the Eleven Labs state with stored API key
fn ensure_client(state: &ElevenLabsState) -> Result<(), String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;

    if client_guard.is_some() {
        return Ok(());
    }

    // Try to load API key from database
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    if let Some(api_key) = SettingsDb::get_api_key(&conn).map_err(|e| e.to_string())? {
        let client = ElevenLabsClient::new(api_key).map_err(|e| e.to_string())?;
        *client_guard = Some(client);
    }

    Ok(())
}

/// Ensure audio cache is initialized
fn ensure_cache(state: &ElevenLabsState) -> Result<AudioCache, String> {
    let mut cache_guard = state.cache.lock().map_err(|e| e.to_string())?;

    if let Some(cache) = cache_guard.as_ref() {
        return Ok(AudioCache::new(cache.cache_dir().to_path_buf()).map_err(|e| e.to_string())?);
    }

    // Create cache directory
    let cache_dir = dirs::cache_dir()
        .ok_or("Could not find cache directory")?
        .join("opcode")
        .join("audio");

    let cache = AudioCache::new(cache_dir).map_err(|e| e.to_string())?;
    *cache_guard = Some(AudioCache::new(cache.cache_dir().to_path_buf()).map_err(|e| e.to_string())?);

    Ok(cache)
}

// ========== Tauri Commands ==========

/// Set the Eleven Labs API key
#[tauri::command]
pub async fn eleven_labs_set_api_key(
    state: State<'_, ElevenLabsState>,
    api_key: String,
) -> Result<bool, String> {
    // Validate the API key first
    let client = ElevenLabsClient::new(api_key.clone()).map_err(|e| e.to_string())?;
    let valid = client.validate_api_key().await.map_err(|e| e.to_string())?;

    if !valid {
        return Err("Invalid API key".to_string());
    }

    // Save to database
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    SettingsDb::save_api_key(&conn, &api_key).map_err(|e| e.to_string())?;

    // Update state
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;
    *client_guard = Some(client);

    Ok(true)
}

/// Check if API key is configured
#[tauri::command]
pub async fn eleven_labs_has_api_key(
    state: State<'_, ElevenLabsState>,
) -> Result<bool, String> {
    ensure_client(&state)?;
    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    Ok(client_guard.is_some())
}

/// List all available voices
#[tauri::command]
pub async fn eleven_labs_list_voices(
    state: State<'_, ElevenLabsState>,
) -> Result<Vec<VoiceProfile>, String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    let voices = client.list_voices().await.map_err(|e| e.to_string())?;

    // Cache voices locally
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    for voice in &voices {
        let _ = VoiceProfileDb::save_voice_profile(&conn, voice, &voice.voice_id);
    }

    Ok(voices)
}

/// Clone a voice from audio files
#[tauri::command]
pub async fn eleven_labs_clone_voice(
    state: State<'_, ElevenLabsState>,
    name: String,
    files: Vec<String>,
    description: Option<String>,
    labels: Option<serde_json::Value>,
) -> Result<VoiceProfile, String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    let request = VoiceCloneRequest {
        name,
        description,
        labels,
        files,
    };

    let voice = client.clone_voice(request).await.map_err(|e| e.to_string())?;

    // Cache the new voice
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    VoiceProfileDb::save_voice_profile(&conn, &voice, &voice.voice_id).map_err(|e| e.to_string())?;

    Ok(voice)
}

/// Delete a voice
#[tauri::command]
pub async fn eleven_labs_delete_voice(
    state: State<'_, ElevenLabsState>,
    voice_id: String,
) -> Result<(), String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    client.delete_voice(&voice_id).await.map_err(|e| e.to_string())?;

    // Remove from local cache
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    VoiceProfileDb::delete_voice_profile(&conn, &voice_id).map_err(|e| e.to_string())?;

    Ok(())
}

/// Generate text-to-speech
#[tauri::command]
pub async fn eleven_labs_tts(
    state: State<'_, ElevenLabsState>,
    text: String,
    voice_id: String,
    model_id: Option<String>,
    voice_settings: Option<VoiceSettings>,
) -> Result<GeneratedAudio, String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    let request = TtsRequest {
        text: text.clone(),
        voice_id: voice_id.clone(),
        model_id: model_id.unwrap_or_else(|| "eleven_monolingual_v1".to_string()),
        voice_settings,
        output_format: "mp3_44100_128".to_string(),
    };

    let audio_data = client.text_to_speech(request).await.map_err(|e| e.to_string())?;

    // Save to cache
    let cache = ensure_cache(&state)?;
    let path = cache.save_audio(&AudioType::Tts, &audio_data, "mp3")
        .await
        .map_err(|e| e.to_string())?;

    // Estimate duration (rough: ~128kbps = 16KB/s)
    let duration_seconds = audio_data.len() as f32 / 16000.0;

    let audio = GeneratedAudio {
        id: uuid::Uuid::new_v4().to_string(),
        audio_type: AudioType::Tts,
        prompt: text,
        duration_seconds,
        local_path: path.to_string_lossy().to_string(),
        supabase_url: None,
        metadata: serde_json::json!({ "voice_id": voice_id }),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // Save record to database
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    AudioCacheDb::save_audio_record(&conn, &audio).map_err(|e| e.to_string())?;

    Ok(audio)
}

/// Generate sound effects
#[tauri::command]
pub async fn eleven_labs_generate_sfx(
    state: State<'_, ElevenLabsState>,
    text: String,
    duration_seconds: Option<f32>,
    prompt_influence: Option<f32>,
) -> Result<GeneratedAudio, String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    let duration = duration_seconds.unwrap_or(3.0);
    let request = SfxRequest {
        text: text.clone(),
        duration_seconds: duration,
        prompt_influence: prompt_influence.unwrap_or(0.5),
    };

    let audio_data = client.generate_sound_effects(request).await.map_err(|e| e.to_string())?;

    // Save to cache
    let cache = ensure_cache(&state)?;
    let path = cache.save_audio(&AudioType::Sfx, &audio_data, "mp3")
        .await
        .map_err(|e| e.to_string())?;

    let audio = GeneratedAudio {
        id: uuid::Uuid::new_v4().to_string(),
        audio_type: AudioType::Sfx,
        prompt: text,
        duration_seconds: duration,
        local_path: path.to_string_lossy().to_string(),
        supabase_url: None,
        metadata: serde_json::json!({}),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // Save record to database
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    AudioCacheDb::save_audio_record(&conn, &audio).map_err(|e| e.to_string())?;

    Ok(audio)
}

/// Get usage information
#[tauri::command]
pub async fn eleven_labs_get_usage(
    state: State<'_, ElevenLabsState>,
) -> Result<UsageInfo, String> {
    ensure_client(&state)?;

    let client_guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = client_guard.as_ref().ok_or("API key not configured")?;

    client.get_usage().await.map_err(|e| e.to_string())
}

/// Assign a voice to a character
#[tauri::command]
pub async fn assign_voice_to_character(
    character_name: String,
    voice_id: String,
    voice_name: String,
    project_id: Option<String>,
) -> Result<CharacterVoice, String> {
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    CharacterVoiceDb::assign_voice(
        &conn,
        &character_name,
        &voice_id,
        &voice_name,
        project_id.as_deref(),
    )
    .map_err(|e| e.to_string())
}

/// List character voice mappings
#[tauri::command]
pub async fn list_character_voices(
    project_id: Option<String>,
) -> Result<Vec<CharacterVoice>, String> {
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    CharacterVoiceDb::get_character_voices(&conn, project_id.as_deref())
        .map_err(|e| e.to_string())
}

/// Get cached audio records
#[tauri::command]
pub async fn get_cached_audio(
    audio_type: String,
) -> Result<Vec<GeneratedAudio>, String> {
    let audio_type = match audio_type.to_lowercase().as_str() {
        "tts" => AudioType::Tts,
        "sfx" => AudioType::Sfx,
        "music" => AudioType::Music,
        _ => return Err("Invalid audio type".to_string()),
    };

    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    AudioCacheDb::get_audio_records(&conn, &audio_type).map_err(|e| e.to_string())
}

/// Delete a cached audio record
#[tauri::command]
pub async fn delete_cached_audio(
    state: State<'_, ElevenLabsState>,
    audio_id: String,
) -> Result<(), String> {
    let db_path = get_db_path().map_err(|e| e.to_string())?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Get the record to find the file path
    if let Some(audio) = AudioCacheDb::get_audio_record(&conn, &audio_id).map_err(|e| e.to_string())? {
        // Delete the file
        let cache = ensure_cache(&state)?;
        let path = PathBuf::from(&audio.local_path);
        cache.delete_audio(&path).await.map_err(|e| e.to_string())?;
    }

    // Delete from database
    AudioCacheDb::delete_audio_record(&conn, &audio_id).map_err(|e| e.to_string())
}

/// Get all commands for registration
pub fn get_commands() -> Vec<&'static str> {
    vec![
        "eleven_labs_set_api_key",
        "eleven_labs_has_api_key",
        "eleven_labs_list_voices",
        "eleven_labs_clone_voice",
        "eleven_labs_delete_voice",
        "eleven_labs_tts",
        "eleven_labs_generate_sfx",
        "eleven_labs_get_usage",
        "assign_voice_to_character",
        "list_character_voices",
        "get_cached_audio",
        "delete_cached_audio",
    ]
}
