# Media

## analyze_image
**Required keys:** `image_url,image_urls,asset_id,asset_ids,asset_ref,asset_refs`

**Optional keys:** `prompt`, `mode`, `max_images`, `url`, `urls`, `media_asset_id`, `media_asset_ids`

**Aliases:** `image` → `image_url`, `url` → `image_url`, `urls` → `image_urls`, `media_asset_id` → `asset_id`, `media_asset_ids` → `asset_ids`

**Types:** `image_url`: string, `image_urls`: string_array, `asset_id`: string, `asset_ids`: string_array, `asset_ref`: object, `asset_refs`: object_array, `prompt`: string, `mode`: string, `max_images`: number, `url`: string, `urls`: string_array, `media_asset_id`: string, `media_asset_ids`: string_array

**Use when:** Use for carousel photo selection, Drive image inspection, uploaded image analysis, and media-library image ranking. Use when the user asks what is in an image or which photos are best for a creative workflow.

**Do not use when:** Do not ask the user for API keys or tokens. This action uses Vibey-managed tools.

Analyzes one or more images using Vibey-managed vision. Use for Google Drive folder photos, uploaded thumbnails, campaign media, carousel selection, quality scoring, text-in-image checks, and brand fit. Accepts asset_ref/asset_refs, public image URLs, or media asset ids. Never ask the user for an API key or token for image analysis.

```json
{"action":"analyze_image","label":"Analyzing photos","data":{"asset_refs":[{"kind":"vibey_asset","asset_id":"UUID"},{"kind":"external_asset","url":"https://..."}],"image_urls":["https://...","https://..."],"asset_ids":["UUID optional"],"prompt":"Rank these for an Instagram carousel. Return visual summary, text, quality, brand fit, risks, and carousel_score."}}
```

Contract example: Rank photos for a carousel
```json
{"action":"analyze_image","label":"Rank photos for a carousel","data":{"image_urls":["https://example.com/photo-1.jpg","https://example.com/photo-2.jpg"],"prompt":"Rank these for an Instagram carousel. Return subject, quality, brand fit, and carousel_score."}}
```

## analyze_video
**Required keys:** `media_url,file_url,url,video_url`

**Optional keys:** `media_url`, `file_url`, `url`, `video_url`, `frame_count`, `frame_interval_seconds`, `extract_frames`, `transcribe`, `model`

**Types:** `media_url`: string, `file_url`: string, `url`: string, `video_url`: string, `frame_count`: number, `frame_interval_seconds`: number, `extract_frames`: boolean, `transcribe`: boolean, `model`: string

Analyzes a video asset for creative workflows. Accepts media_url or asset_ref with a URL. Videos can extract frames and transcript. Use transcribe_audio for audio-only files.

```json
{"action":"analyze_video","label":"Analyzing your video","data":{"asset_ref":{"kind":"external_asset","url":"https://..."},"media_url":"https://...","extract_frames":true,"transcribe":true}}
```

## edit_image
**Required keys:** `prompt`

**Optional keys:** `prompt`, `image_url`, `image_asset_id`, `canvas_id`, `node_id`

**Types:** `prompt`: string, `image_url`: string, `image_asset_id`: string, `canvas_id`: string, `node_id`: string

Image-to-image edit using asset_ref, a parent image asset id, or a parent image URL. Prefer asset_ref when the image came from upload or an integration. Pass canvas_node_id when invoked from the Ad Creative Canvas so the node is patched directly.

```json
{"action":"edit_image","label":"Editing image","data":{"prompt":"Make the headline larger and shift background to deep navy","asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"parent_image_asset_id":"UUID","parent_image_url":"https://... optional if asset id provided","model":"gemini-3.1-flash-image-preview","aspect_ratio":"1:1","canvas_node_id":"UUID optional"}}
```

## extract_url_transcript
**Required keys:** `url`

**Optional keys:** `url`

**Types:** `url`: string

Extracts transcript text from a public video URL when supported.

```json
{"action":"extract_url_transcript","label":"Pulling transcript","data":{"url":"https://..."}}
```

## generate_image
**Optional keys:** `prompt`, `model`, `size`, `aspect_ratio`, `image_url`, `image_asset_id`

**Types:** `prompt`: string, `model`: string, `size`: string, `aspect_ratio`: string, `image_url`: string, `image_asset_id`: string

Generate a new image from a text prompt, OR edit/modify an existing image by providing asset_ref/asset_refs or input_image_url(s) alongside a prompt describing the desired changes. Supports: text-to-image generation, image editing (change specific elements, add/remove objects, modify text on images, inpainting), and multi-image composition (up to 14 input images). When editing, describe what to change and what to keep. Can attach to an ad for campaign media with ad_id, attach directly to an avatar portrait with avatar_id, or patch an Ad Creative Canvas node with canvas_node_id. User sees: generated image in chat + Media tab; when avatar_id is provided the backend also sets persona_data.avatar_image on that avatar. When attaching to ad, follow up with update_ad to set image_url on the ad. Available models: google/gemini-3.1-flash-image aka "Nano Banana 2" (default, fast, good for edits and multi-image), openai/gpt-5.4-image-2 aka "GPT Image 2" (high quality, photorealistic, text-in-image). When the user refers to "Nano Banana", use google/gemini-3.1-flash-image. When the user refers to "GPT Image", "Image 2", use openai/gpt-5.4-image-2. Pass model in data only to override the default.

```json
{"action":"generate_image","label":"Creating avatar portrait","data":{"prompt":"Create a polished buyer persona portrait based on this avatar profile.","model":"google/gemini-3.1-flash-image","asset_ref":{"kind":"external_asset","url":"https://... optional single image to edit"},"asset_refs":[{"kind":"external_asset","url":"https://... optional multi-image reference"}],"input_image_url":"https://... (single image to edit)","input_image_urls":["https://...","https://... (optional, up to 14 images for multi-image composition)"],"aspect_ratio":"1:1","avatar_id":"UUID optional — sets avatar portrait","ad_id":"UUID optional","canvas_node_id":"UUID optional — patches Ad Creative Canvas node"}}
```

## generate_video
**Required keys:** `prompt`

**Optional keys:** `prompt`, `image_url`, `duration_seconds`, `aspect_ratio`

**Types:** `prompt`: string, `image_url`: string, `duration_seconds`: number, `aspect_ratio`: string

Starts video generation. Async — after calling, use the wait tool (wait 30s) then poll with get_video_status. Repeat: wait(30) -> get_video_status until status is succeeded or failed. Max ~5 polls (~2.5 min). If still processing after that, inform the user. Available models: veo-3.1-fast (default, general text/image-to-video), seedance-2 (ByteDance Seedance 2.0 on Replicate — multimodal refs, synced audio; requires integer duration 1–15; use reference_video_urls for motion/style — higher per-second credits than text-only), kling-v3 (cinematic + audio/lip-sync, multi-shot), grok-imagine-video (general, video editing), gen-4.5 (premium cinematic), fabric-1.0 (talking head from image + audio, no prompt needed). Pass model in data to select. fabric-1.0 requires image_url + audio_url instead of prompt. seedance-2: do not combine reference_image_urls with image_url/last_frame_url; last_frame_url requires image_url.

```json
{"action":"generate_video","label":"Generating your video","data":{"prompt":"...","model":"seedance-2","duration":7,"aspect_ratio":"16:9","resolution":"720p","image_url":"optional first frame","last_frame_url":"optional last frame (requires image_url)","reference_image_urls":["https://..."],"reference_video_urls":["https://..."],"reference_audio_urls":["https://..."],"generate_audio":true,"seed":99}}
```

## get_media_generation_status
**Required keys:** `job_id`

**Optional keys:** `job_id`

**Types:** `job_id`: string

Reads status of in-flight media generation jobs for the campaign.

```json
{"action":"get_media_generation_status","label":"Checking media jobs","data":{}}
```

## get_video_status
**Required keys:** `operation_id`

**Optional keys:** `operation_id`

**Types:** `operation_id`: string

Polls video generation job status. **job_id is REQUIRED**. Call after wait(30) following generate_video. Returns status: starting, processing, succeeded, or failed. If still processing, call wait(30) and poll again. When succeeded, returns the video URL.

```json
{"action":"get_video_status","label":"Checking video status","data":{"job_id":"..."}}
```

## process_media
**Required keys:** `operation`

**Optional keys:** `operation`, `url`, `video_url`, `audio_url`, `overlay_url`, `background_url`, `subtitle_url`, `subtitle_content`, `url2`, `inputs`, `duration_seconds`, `timestamp`, `frame_count`, `frame_interval_seconds`, `interval_seconds`, `max_frames`, `width`, `height`, `x`, `y`, `count`, `factor`, `strength`, `amount`, `angle`, `resolution`, `format`, `effect`, `transition`, `text`, `preset`

**Types:** `operation`: string, `url`: string, `video_url`: string, `audio_url`: string, `overlay_url`: string, `background_url`: string, `subtitle_url`: string, `subtitle_content`: string, `url2`: string, `inputs`: object_array, `duration_seconds`: number, `timestamp`: number, `frame_count`: number, `frame_interval_seconds`: number, `interval_seconds`: number, `max_frames`: number, `width`: number, `height`: number, `x`: number, `y`: number, `count`: number, `factor`: number, `strength`: number, `amount`: number, `angle`: number, `format`: string, `resolution`: string, `effect`: string, `transition`: string, `text`: string, `preset`: string

Processes media files server-side using ffmpeg. Accepts asset_ref/asset_refs for connected files or direct URL fields. 28 operations across 7 categories. STRUCTURAL: trim, concat, convert, extract_audio, add_audio, resize, compose (full pipeline). AUDIO: audio_effect (reverb/echo/fade/volume/pitch/normalize/bass_boost/speed), silence_remove (auto jump-cuts by detecting and cutting silent gaps). VISUAL: color_grade (brightness/contrast/saturation/gamma/hue/temperature/presets), blur (gaussian/box), vignette, sharpen, denoise (nlmeans/hqdn3d). PLAYBACK: reverse, loop, speed (pitch-preserved speed ramp). COMPOSITING: overlay (PiP/watermark/logo), crop, text_overlay (burn styled text), subtitle_burn (burn SRT/ASS), transition (30+ crossfade effects), chroma_key (green screen removal), split_screen (2-4 videos side-by-side/stacked/grid). ANALYSIS: probe (returns metadata only — no upload), thumbnail (extract frame as image), frame_extract (storyboard strip at intervals), waveform (audio visualization image). All inputs are URLs after normalization. Output uploaded to campaign media. Max 500MB/file, 1GB total, 120s timeout.

```json
{"action":"process_media","label":"Analyzing video","data":{"operation":"probe","asset_ref":{"kind":"external_asset","url":"https://..."},"url":"https://..."}}
```

## read_document
**Required keys:** `asset_id,asset_ref`

**Optional keys:** `asset_ref`, `mode`, `page_range`, `query`, `max_pages`, `model_id`

**Types:** `asset_id`: string, `asset_ref`: object, `mode`: string, `query`: string, `max_pages`: number, `model_id`: string

Reads an uploaded asset by media `asset_id` or `asset_ref` with page-aware support for PDFs and native image/document references. Use mode=describe first, then mode=read with page_range for large files. Supports mode=search for simple query matching in indexed text.

```json
{"action":"read_document","label":"Reading your document","data":{"asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"asset_id":"UUID","mode":"read","page_range":[1,5],"max_pages":20,"query":"optional","model_id":"optional current model id"}}
```

## transcribe_audio
**Required keys:** `media_url,file_url,url,audio_url,video_url`

**Optional keys:** `media_url`, `file_url`, `url`, `audio_url`, `video_url`, `language`, `lang`, `language_code`, `model`

**Types:** `media_url`: string, `file_url`: string, `url`: string, `audio_url`: string, `video_url`: string, `language`: string, `lang`: string, `language_code`: string, `model`: string

Transcribes an uploaded or externally hosted audio file using Vibey-managed Deepgram Nova-3. Use the original audio URL for WhatsApp OGG/Opus voice notes, MP3, M4A, WAV, and audio-only files; do not convert to MP4 just to transcribe. Accepts media_url, audio_url, file_url, url, video_url, or asset_ref with a URL. If the user or surrounding context explicitly identifies the spoken language, pass it with language using the provider language code; clear language hints improve transcripts for multilingual audio and avoid relying on auto-detection.

```json
{"action":"transcribe_audio","label":"Transcribing audio","data":{"media_url":"https://.../voice.ogg","language":"<provider-language-code>"}}
```

```json
{"action":"transcribe_audio","label":"Transcribing audio","data":{"media_url":"https://.../voice.ogg"}}
```
