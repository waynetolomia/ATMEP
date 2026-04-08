# Listening Section Audio Files

This directory should contain the audio files for the listening section of the examination portal.

## Required Audio Files

The listening section has 30 questions, so you need 30 corresponding audio files:

- `listening_1.mp3` to `listening_30.mp3`

## Audio Content Guidelines

Each audio file should be a short recording (15-30 seconds) that corresponds to the listening question. For example:

- **listening_1.mp3**: A person asking for directions to the train station
- **listening_2.mp3**: Two friends discussing weekend plans
- **listening_3.mp3**: A weather forecast
- etc.

## Technical Specifications

- **Format**: MP3 (primary) or WAV (fallback)
- **Duration**: 15-30 seconds per file
- **Quality**: Clear speech, good recording quality
- **Language**: English
- **Content**: Natural conversations, announcements, or monologues

## Placeholder Implementation

Currently, the application will show audio controls but the files don't exist yet. To test the functionality:

1. Add actual audio files to this directory
2. Or use the browser's developer tools to simulate audio loading
3. The audio controls will appear above each listening question

## Alternative: Data URIs

If you prefer not to use separate files, you can modify the `getListeningAudio()` function in `script.js` to return data URIs with embedded audio data instead of file paths.