use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use tokio::fs;
use uuid::Uuid;

use super::types::*;

/// Audio cache manager for local file storage
pub struct AudioCache {
    cache_dir: PathBuf,
}

impl AudioCache {
    /// Create a new audio cache manager
    pub fn new(cache_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&cache_dir)?;
        Ok(Self { cache_dir })
    }

    /// Get the cache directory path
    pub fn cache_dir(&self) -> &Path {
        &self.cache_dir
    }

    /// Save audio data to cache
    pub async fn save_audio(
        &self,
        audio_type: &AudioType,
        data: &[u8],
        extension: &str,
    ) -> Result<PathBuf> {
        let subdir = match audio_type {
            AudioType::Tts => "tts",
            AudioType::Sfx => "sfx",
            AudioType::Music => "music",
        };

        let dir = self.cache_dir.join(subdir);
        fs::create_dir_all(&dir).await?;

        let filename = format!("{}.{}", Uuid::new_v4(), extension);
        let path = dir.join(&filename);

        fs::write(&path, data)
            .await
            .map_err(|e| anyhow!("Failed to write audio file: {}", e))?;

        Ok(path)
    }

    /// Delete a cached audio file
    pub async fn delete_audio(&self, path: &Path) -> Result<()> {
        if path.exists() {
            fs::remove_file(path)
                .await
                .map_err(|e| anyhow!("Failed to delete audio file: {}", e))?;
        }
        Ok(())
    }

    /// Get all cached files for a given type
    pub async fn list_cached_files(&self, audio_type: &AudioType) -> Result<Vec<PathBuf>> {
        let subdir = match audio_type {
            AudioType::Tts => "tts",
            AudioType::Sfx => "sfx",
            AudioType::Music => "music",
        };

        let dir = self.cache_dir.join(subdir);
        if !dir.exists() {
            return Ok(vec![]);
        }

        let mut files = vec![];
        let mut entries = fs::read_dir(&dir).await?;

        while let Some(entry) = entries.next_entry().await? {
            if entry.file_type().await?.is_file() {
                files.push(entry.path());
            }
        }

        Ok(files)
    }

    /// Clear all cached files for a given type
    pub async fn clear_cache(&self, audio_type: &AudioType) -> Result<u32> {
        let files = self.list_cached_files(audio_type).await?;
        let count = files.len() as u32;

        for file in files {
            self.delete_audio(&file).await?;
        }

        Ok(count)
    }

    /// Get total cache size in bytes
    pub async fn get_cache_size(&self) -> Result<u64> {
        let mut total_size = 0u64;

        for audio_type in [AudioType::Tts, AudioType::Sfx, AudioType::Music] {
            let files = self.list_cached_files(&audio_type).await?;
            for file in files {
                if let Ok(metadata) = fs::metadata(&file).await {
                    total_size += metadata.len();
                }
            }
        }

        Ok(total_size)
    }
}

/// Database operations for audio cache metadata
pub struct AudioCacheDb;

impl AudioCacheDb {
    /// Save a generated audio record to the database
    pub fn save_audio_record(conn: &Connection, audio: &GeneratedAudio) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO audio_cache
             (id, audio_type, prompt, duration_seconds, local_path, supabase_url, metadata, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            (
                &audio.id,
                serde_json::to_string(&audio.audio_type)?,
                &audio.prompt,
                audio.duration_seconds,
                &audio.local_path,
                &audio.supabase_url,
                serde_json::to_string(&audio.metadata)?,
                &audio.created_at,
            ),
        )?;
        Ok(())
    }

    /// Get all audio records of a given type
    pub fn get_audio_records(conn: &Connection, audio_type: &AudioType) -> Result<Vec<GeneratedAudio>> {
        let type_str = serde_json::to_string(audio_type)?;
        let mut stmt = conn.prepare(
            "SELECT id, audio_type, prompt, duration_seconds, local_path, supabase_url, metadata, created_at
             FROM audio_cache WHERE audio_type = ?1 ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map([&type_str], |row| {
            Ok(GeneratedAudio {
                id: row.get(0)?,
                audio_type: serde_json::from_str(&row.get::<_, String>(1)?).unwrap_or(AudioType::Tts),
                prompt: row.get(2)?,
                duration_seconds: row.get(3)?,
                local_path: row.get(4)?,
                supabase_url: row.get(5)?,
                metadata: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or(serde_json::json!({})),
                created_at: row.get(7)?,
            })
        })?;

        let mut records = vec![];
        for row in rows {
            records.push(row?);
        }
        Ok(records)
    }

    /// Delete an audio record from the database
    pub fn delete_audio_record(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM audio_cache WHERE id = ?1", [id])?;
        Ok(())
    }

    /// Get a single audio record by ID
    pub fn get_audio_record(conn: &Connection, id: &str) -> Result<Option<GeneratedAudio>> {
        let mut stmt = conn.prepare(
            "SELECT id, audio_type, prompt, duration_seconds, local_path, supabase_url, metadata, created_at
             FROM audio_cache WHERE id = ?1"
        )?;

        let mut rows = stmt.query([id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(GeneratedAudio {
                id: row.get(0)?,
                audio_type: serde_json::from_str(&row.get::<_, String>(1)?).unwrap_or(AudioType::Tts),
                prompt: row.get(2)?,
                duration_seconds: row.get(3)?,
                local_path: row.get(4)?,
                supabase_url: row.get(5)?,
                metadata: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or(serde_json::json!({})),
                created_at: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }
}

/// Voice profile database operations
pub struct VoiceProfileDb;

impl VoiceProfileDb {
    /// Save a voice profile to the database
    pub fn save_voice_profile(conn: &Connection, voice: &VoiceProfile, provider_voice_id: &str) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO voice_profiles
             (id, name, description, category, provider, provider_voice_id, labels, preview_url,
              settings_stability, settings_similarity_boost, settings_style, settings_use_speaker_boost,
              updated_at)
             VALUES (?1, ?2, ?3, ?4, 'elevenlabs', ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP)",
            (
                &voice.voice_id,
                &voice.name,
                &voice.description,
                &voice.category,
                provider_voice_id,
                voice.labels.as_ref().map(|l| serde_json::to_string(l).ok()).flatten(),
                &voice.preview_url,
                voice.settings.stability,
                voice.settings.similarity_boost,
                voice.settings.style,
                voice.settings.use_speaker_boost as i32,
            ),
        )?;
        Ok(())
    }

    /// Get all voice profiles from the database
    pub fn get_voice_profiles(conn: &Connection) -> Result<Vec<VoiceProfile>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, category, labels, preview_url,
                    settings_stability, settings_similarity_boost, settings_style, settings_use_speaker_boost
             FROM voice_profiles ORDER BY name"
        )?;

        let rows = stmt.query_map([], |row| {
            let labels_str: Option<String> = row.get(4)?;
            let labels = labels_str.and_then(|s| serde_json::from_str(&s).ok());

            Ok(VoiceProfile {
                voice_id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                labels,
                preview_url: row.get(5)?,
                settings: VoiceSettings {
                    stability: row.get(6)?,
                    similarity_boost: row.get(7)?,
                    style: row.get(8)?,
                    use_speaker_boost: row.get::<_, i32>(9)? != 0,
                },
            })
        })?;

        let mut profiles = vec![];
        for row in rows {
            profiles.push(row?);
        }
        Ok(profiles)
    }

    /// Delete a voice profile from the database
    pub fn delete_voice_profile(conn: &Connection, voice_id: &str) -> Result<()> {
        conn.execute("DELETE FROM voice_profiles WHERE id = ?1", [voice_id])?;
        Ok(())
    }
}

/// Character voice mapping database operations
pub struct CharacterVoiceDb;

impl CharacterVoiceDb {
    /// Assign a voice to a character
    pub fn assign_voice(
        conn: &Connection,
        character_name: &str,
        voice_id: &str,
        voice_name: &str,
        project_id: Option<&str>,
    ) -> Result<CharacterVoice> {
        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR REPLACE INTO character_voices
             (id, character_name, voice_id, voice_name, project_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (&id, character_name, voice_id, voice_name, project_id, &created_at),
        )?;

        Ok(CharacterVoice {
            id,
            character_name: character_name.to_string(),
            voice_id: voice_id.to_string(),
            voice_name: voice_name.to_string(),
            project_id: project_id.map(|s| s.to_string()),
            created_at,
        })
    }

    /// Get all character voice mappings
    pub fn get_character_voices(conn: &Connection, project_id: Option<&str>) -> Result<Vec<CharacterVoice>> {
        let sql = match project_id {
            Some(_) => "SELECT id, character_name, voice_id, voice_name, project_id, created_at
                        FROM character_voices WHERE project_id = ?1 ORDER BY character_name",
            None => "SELECT id, character_name, voice_id, voice_name, project_id, created_at
                     FROM character_voices ORDER BY character_name",
        };

        let mut stmt = conn.prepare(sql)?;

        let rows = if let Some(pid) = project_id {
            stmt.query_map([pid], |row| {
                Ok(CharacterVoice {
                    id: row.get(0)?,
                    character_name: row.get(1)?,
                    voice_id: row.get(2)?,
                    voice_name: row.get(3)?,
                    project_id: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
        } else {
            stmt.query_map([], |row| {
                Ok(CharacterVoice {
                    id: row.get(0)?,
                    character_name: row.get(1)?,
                    voice_id: row.get(2)?,
                    voice_name: row.get(3)?,
                    project_id: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
        };

        let mut mappings = vec![];
        for row in rows {
            mappings.push(row?);
        }
        Ok(mappings)
    }

    /// Remove a character voice mapping
    pub fn remove_mapping(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM character_voices WHERE id = ?1", [id])?;
        Ok(())
    }
}

/// Settings database operations
pub struct SettingsDb;

impl SettingsDb {
    /// Save the API key (encrypted in production)
    pub fn save_api_key(conn: &Connection, api_key: &str) -> Result<()> {
        // In production, this should be encrypted
        conn.execute(
            "INSERT OR REPLACE INTO eleven_labs_settings (key, value, updated_at)
             VALUES ('api_key', ?1, CURRENT_TIMESTAMP)",
            [api_key],
        )?;
        Ok(())
    }

    /// Get the API key
    pub fn get_api_key(conn: &Connection) -> Result<Option<String>> {
        let mut stmt = conn.prepare(
            "SELECT value FROM eleven_labs_settings WHERE key = 'api_key'"
        )?;

        let mut rows = stmt.query([])?;

        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    /// Remove the API key
    pub fn remove_api_key(conn: &Connection) -> Result<()> {
        conn.execute("DELETE FROM eleven_labs_settings WHERE key = 'api_key'", [])?;
        Ok(())
    }
}
