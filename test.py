import requests
from youtube_transcript_api import YouTubeTranscriptApi
import json
import os
from supadata import Supadata, SupadataError

supadata = Supadata(api_key=os.getenv("SUPADATA_API_KEY"))

def format_time(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def format_transcript_with_timestamps(transcript_data):
    """Format transcript with timestamps every 10th item, similar to youtube-utils"""
    if not transcript_data or len(transcript_data) == 0:
        return ""
    
    formatted_parts = []
    for idx, item in enumerate(transcript_data):
        # Handle both dictionary and object formats
        if hasattr(item, 'text'):
            text = item.text
            start_time = item.start
        else:
            text = item['text']
            start_time = item['start']
            
        # Add timestamp every 10th item (0, 10, 20, etc.)
        if idx % 10 == 0:
            timestamp = format_time(start_time)
            formatted_parts.append(f"[{timestamp}] {text}")
        else:
            formatted_parts.append(text)
    
    return ' '.join(formatted_parts)


# YouTube video ID
video_id = "a_ZOXIikA30" 

try:
    transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
    formatted_transcript = format_transcript_with_timestamps(transcript_data)

    # Write both raw transcript data and formatted transcript to result.txt
    with open('result.txt', 'w', encoding='utf-8') as f:
        f.write("=== Raw Transcript Data ===\n")
        f.write(json.dumps(transcript_data, indent=2, ensure_ascii=False))
        f.write("\n\n=== Formatted Transcript ===\n")
        f.write(formatted_transcript)

except Exception as e:
    print(f"Error: Could not fetch transcript for video {video_id}")
    print(f"Details: {str(e)}")


