use anyhow::{anyhow, Result};
use reqwest::{header, Client, multipart};
use std::path::Path;
use tokio::fs;

use super::types::*;

const ELEVEN_LABS_BASE_URL: &str = "https://api.elevenlabs.io/v1";

/// Eleven Labs API client
pub struct ElevenLabsClient {
    client: Client,
    api_key: String,
}

impl ElevenLabsClient {
    /// Create a new Eleven Labs client
    pub fn new(api_key: String) -> Result<Self> {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            "xi-api-key",
            header::HeaderValue::from_str(&api_key)
                .map_err(|e| anyhow!("Invalid API key format: {}", e))?,
        );

        let client = Client::builder()
            .default_headers(headers)
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self { client, api_key })
    }

    /// Get the API key (for storage)
    pub fn api_key(&self) -> &str {
        &self.api_key
    }

    // ========== Voice Management ==========

    /// List all available voices
    pub async fn list_voices(&self) -> Result<Vec<VoiceProfile>> {
        let url = format!("{}/voices", ELEVEN_LABS_BASE_URL);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to fetch voices: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        let voices_response: VoicesResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse voices response: {}", e))?;

        Ok(voices_response.voices.into_iter().map(VoiceProfile::from).collect())
    }

    /// Get a specific voice by ID
    pub async fn get_voice(&self, voice_id: &str) -> Result<VoiceProfile> {
        let url = format!("{}/voices/{}", ELEVEN_LABS_BASE_URL, voice_id);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to fetch voice: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        let voice: ElevenLabsVoice = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse voice response: {}", e))?;

        Ok(VoiceProfile::from(voice))
    }

    /// Clone a voice from audio files
    pub async fn clone_voice(&self, request: VoiceCloneRequest) -> Result<VoiceProfile> {
        let url = format!("{}/voices/add", ELEVEN_LABS_BASE_URL);

        let mut form = multipart::Form::new()
            .text("name", request.name.clone());

        if let Some(desc) = &request.description {
            form = form.text("description", desc.clone());
        }

        if let Some(labels) = &request.labels {
            form = form.text("labels", serde_json::to_string(labels)?);
        }

        // Add audio files
        for file_path in &request.files {
            let path = Path::new(file_path);
            let file_name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("audio.mp3")
                .to_string();

            let file_bytes = fs::read(path)
                .await
                .map_err(|e| anyhow!("Failed to read file {}: {}", file_path, e))?;

            let part = multipart::Part::bytes(file_bytes)
                .file_name(file_name)
                .mime_str("audio/mpeg")?;

            form = form.part("files", part);
        }

        let response = self.client
            .post(&url)
            .multipart(form)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to clone voice: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        #[derive(serde::Deserialize)]
        struct CloneResponse {
            voice_id: String,
        }

        let clone_response: CloneResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse clone response: {}", e))?;

        // Fetch the full voice profile
        self.get_voice(&clone_response.voice_id).await
    }

    /// Delete a voice
    pub async fn delete_voice(&self, voice_id: &str) -> Result<()> {
        let url = format!("{}/voices/{}", ELEVEN_LABS_BASE_URL, voice_id);

        let response = self.client
            .delete(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to delete voice: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        Ok(())
    }

    // ========== Text-to-Speech ==========

    /// Generate speech from text
    pub async fn text_to_speech(&self, request: TtsRequest) -> Result<Vec<u8>> {
        let url = format!(
            "{}/text-to-speech/{}?output_format={}",
            ELEVEN_LABS_BASE_URL,
            request.voice_id,
            request.output_format
        );

        #[derive(serde::Serialize)]
        struct TtsBody {
            text: String,
            model_id: String,
            #[serde(skip_serializing_if = "Option::is_none")]
            voice_settings: Option<VoiceSettings>,
        }

        let body = TtsBody {
            text: request.text,
            model_id: request.model_id,
            voice_settings: request.voice_settings,
        };

        let response = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to generate speech: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| anyhow!("Failed to read audio data: {}", e))?;

        Ok(bytes.to_vec())
    }

    // ========== Sound Effects ==========

    /// Generate sound effects
    pub async fn generate_sound_effects(&self, request: SfxRequest) -> Result<Vec<u8>> {
        let url = format!("{}/sound-generation", ELEVEN_LABS_BASE_URL);

        #[derive(serde::Serialize)]
        struct SfxBody {
            text: String,
            duration_seconds: f32,
            prompt_influence: f32,
        }

        let body = SfxBody {
            text: request.text,
            duration_seconds: request.duration_seconds,
            prompt_influence: request.prompt_influence,
        };

        let response = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to generate sound effects: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| anyhow!("Failed to read audio data: {}", e))?;

        Ok(bytes.to_vec())
    }

    // ========== Usage & Subscription ==========

    /// Get subscription/usage info
    pub async fn get_usage(&self) -> Result<UsageInfo> {
        let url = format!("{}/user/subscription", ELEVEN_LABS_BASE_URL);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to fetch usage info: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow!("API error {}: {}", status, text));
        }

        let subscription: SubscriptionInfo = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        Ok(UsageInfo::from(subscription))
    }

    /// Validate the API key by making a simple request
    pub async fn validate_api_key(&self) -> Result<bool> {
        match self.get_usage().await {
            Ok(_) => Ok(true),
            Err(e) => {
                if e.to_string().contains("401") {
                    Ok(false)
                } else {
                    Err(e)
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = ElevenLabsClient::new("test_key".to_string());
        assert!(client.is_ok());
    }
}
