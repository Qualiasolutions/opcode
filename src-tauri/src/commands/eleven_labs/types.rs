use serde::{Deserialize, Serialize};

/// Voice settings for TTS generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSettings {
    pub stability: f32,
    pub similarity_boost: f32,
    #[serde(default)]
    pub style: f32,
    #[serde(default)]
    pub use_speaker_boost: bool,
}

impl Default for VoiceSettings {
    fn default() -> Self {
        Self {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
        }
    }
}

/// Voice profile from Eleven Labs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceProfile {
    pub voice_id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub labels: Option<serde_json::Value>,
    #[serde(default)]
    pub preview_url: Option<String>,
    #[serde(default)]
    pub settings: VoiceSettings,
}

/// Character to voice mapping
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterVoice {
    pub id: String,
    pub character_name: String,
    pub voice_id: String,
    pub voice_name: String,
    pub project_id: Option<String>,
    pub created_at: String,
}

/// Generated audio result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedAudio {
    pub id: String,
    pub audio_type: AudioType,
    pub prompt: String,
    pub duration_seconds: f32,
    pub local_path: String,
    pub supabase_url: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: String,
}

/// Type of generated audio
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AudioType {
    Tts,
    Sfx,
    Music,
}

/// TTS request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest {
    pub text: String,
    pub voice_id: String,
    #[serde(default = "default_model_id")]
    pub model_id: String,
    #[serde(default)]
    pub voice_settings: Option<VoiceSettings>,
    #[serde(default = "default_output_format")]
    pub output_format: String,
}

fn default_model_id() -> String {
    "eleven_monolingual_v1".to_string()
}

fn default_output_format() -> String {
    "mp3_44100_128".to_string()
}

/// Sound effects request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SfxRequest {
    pub text: String,
    #[serde(default = "default_sfx_duration")]
    pub duration_seconds: f32,
    #[serde(default = "default_prompt_influence")]
    pub prompt_influence: f32,
}

fn default_sfx_duration() -> f32 {
    3.0
}

fn default_prompt_influence() -> f32 {
    0.5
}

/// Music generation request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicRequest {
    pub prompt: String,
    #[serde(default = "default_music_duration")]
    pub duration_seconds: f32,
    #[serde(default)]
    pub style: Option<String>,
    #[serde(default)]
    pub mood: Option<String>,
}

fn default_music_duration() -> f32 {
    30.0
}

/// Voice clone request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceCloneRequest {
    pub name: String,
    pub description: Option<String>,
    pub labels: Option<serde_json::Value>,
    pub files: Vec<String>, // File paths
}

/// Eleven Labs API usage info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub character_count: i64,
    pub character_limit: i64,
    pub can_extend_character_limit: bool,
    pub allowed_to_extend_character_limit: bool,
    pub next_character_count_reset_unix: i64,
    pub voice_limit: i32,
    pub professional_voice_limit: i32,
    pub can_extend_voice_limit: bool,
    pub can_use_instant_voice_cloning: bool,
    pub can_use_professional_voice_cloning: bool,
}

/// Sync result for cloud operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub voices_synced: i32,
    pub audio_synced: i32,
    pub errors: Vec<String>,
}

/// API response wrapper for voices list
#[derive(Debug, Deserialize)]
pub struct VoicesResponse {
    pub voices: Vec<ElevenLabsVoice>,
}

/// Raw voice data from Eleven Labs API
#[derive(Debug, Deserialize)]
pub struct ElevenLabsVoice {
    pub voice_id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub labels: Option<serde_json::Value>,
    #[serde(default)]
    pub preview_url: Option<String>,
    #[serde(default)]
    pub settings: Option<ElevenLabsVoiceSettings>,
}

#[derive(Debug, Deserialize)]
pub struct ElevenLabsVoiceSettings {
    #[serde(default)]
    pub stability: Option<f32>,
    #[serde(default)]
    pub similarity_boost: Option<f32>,
    #[serde(default)]
    pub style: Option<f32>,
    #[serde(default)]
    pub use_speaker_boost: Option<bool>,
}

impl From<ElevenLabsVoice> for VoiceProfile {
    fn from(voice: ElevenLabsVoice) -> Self {
        let settings = voice.settings.map(|s| VoiceSettings {
            stability: s.stability.unwrap_or(0.5),
            similarity_boost: s.similarity_boost.unwrap_or(0.75),
            style: s.style.unwrap_or(0.0),
            use_speaker_boost: s.use_speaker_boost.unwrap_or(true),
        }).unwrap_or_default();

        VoiceProfile {
            voice_id: voice.voice_id,
            name: voice.name,
            description: voice.description,
            category: voice.category.unwrap_or_else(|| "premade".to_string()),
            labels: voice.labels,
            preview_url: voice.preview_url,
            settings,
        }
    }
}

/// Subscription info response
#[derive(Debug, Deserialize)]
pub struct SubscriptionInfo {
    pub character_count: i64,
    pub character_limit: i64,
    pub can_extend_character_limit: bool,
    pub allowed_to_extend_character_limit: bool,
    pub next_character_count_reset_unix: i64,
    pub voice_limit: i32,
    pub professional_voice_limit: i32,
    pub can_extend_voice_limit: bool,
    pub can_use_instant_voice_cloning: bool,
    pub can_use_professional_voice_cloning: bool,
}

impl From<SubscriptionInfo> for UsageInfo {
    fn from(sub: SubscriptionInfo) -> Self {
        UsageInfo {
            character_count: sub.character_count,
            character_limit: sub.character_limit,
            can_extend_character_limit: sub.can_extend_character_limit,
            allowed_to_extend_character_limit: sub.allowed_to_extend_character_limit,
            next_character_count_reset_unix: sub.next_character_count_reset_unix,
            voice_limit: sub.voice_limit,
            professional_voice_limit: sub.professional_voice_limit,
            can_extend_voice_limit: sub.can_extend_voice_limit,
            can_use_instant_voice_cloning: sub.can_use_instant_voice_cloning,
            can_use_professional_voice_cloning: sub.can_use_professional_voice_cloning,
        }
    }
}
