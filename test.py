import requests
import time # Import the time module for latency testing

# def fetch_youtube_info(video_id, api_key):
#     url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={api_key}"
#     res = requests.get(url)
#     if not res.ok:
#         print("YouTube API response not ok:", res.status_code, res.text)
#         return None
#     data = res.json()
#     print("Full API response:", data)
#     if not data.get("items") or not data["items"]:
#         print("YouTube API returned no items:", data)
#         return None
#     return data["items"]

from youtube_transcript_api import YouTubeTranscriptApi

def format_time(seconds):
    """Format seconds to MM:SS format like in youtube-utils"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

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

# Configure proxy for requests
proxy_config = {
    'http': 'http://toehivex-KR-rotate:esiwn5hn17xs@p.webshare.io:80',
    'https': 'http://toehivex-KR-rotate:esiwn5hn17xs@p.webshare.io:80'
}

# Monkey patch the requests session to use proxy
original_get = requests.get
def patched_get(*args, **kwargs):
    kwargs['proxies'] = proxy_config
    kwargs['timeout'] = 30
    return original_get(*args, **kwargs)

requests.get = patched_get

# YouTube video ID - NEW VIDEO
video_id = "pbEhk5NokJo" 

print(f"Extracting Thai transcript with timestamps for YouTube video ID: {video_id}")
print(f"Using proxy: p.webshare.io:80\n")

try:
    # Set up proxy for youtube-transcript-api
    print("Attempting to fetch transcript using proxy...")
    start_time = time.time()
    
    # Try to get Thai transcript directly with the proxy
    try:
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=['th'], proxies=proxy_config)
        print(f"Successfully fetched Thai transcript using direct method!")
        
        # Debug: Show first few items with their properties
        print(f"\nFirst transcript item details:")
        first_item = transcript_data[0]
        print(f"  Text: {first_item['text']}")
        print(f"  Start: {first_item['start']}s")
        print(f"  Duration: {first_item['duration']}s")
        
        # Format transcript with timestamps (similar to youtube-utils)
        formatted_transcript = format_transcript_with_timestamps(transcript_data)
        
        # Also create a detailed version with all timestamps
        detailed_transcript_lines = []
        for item in transcript_data:
            timestamp = format_time(item['start'])
            detailed_transcript_lines.append(f"[{timestamp}] {item['text']}")
        detailed_transcript = '\n'.join(detailed_transcript_lines)
        
        end_time = time.time()
        latency = end_time - start_time
        
        print(f"\nSuccessfully fetched Thai transcript!")
        print(f"Latency: {latency:.4f} seconds")
        print(f"Number of transcript segments: {len(transcript_data)}")
        print(f"Formatted transcript length: {len(formatted_transcript)} characters")
        print(f"Detailed transcript length: {len(detailed_transcript)} characters")
        
        # Save formatted transcript (like youtube-utils format) - NEW FILENAMES
        filename_formatted = f"thai_transcript_{video_id}_formatted.txt"
        with open(filename_formatted, 'w', encoding='utf-8') as f:
            f.write(f"Thai Transcript for YouTube Video: https://www.youtube.com/watch?v={video_id}\n")
            f.write(f"Language: Thai (auto-generated)\n")
            f.write(f"Format: Timestamps every 10th segment (like youtube-utils)\n")
            f.write("=" * 70 + "\n\n")
            f.write(formatted_transcript)
        
        # Save detailed transcript (all timestamps) - NEW FILENAMES
        filename_detailed = f"thai_transcript_{video_id}_detailed.txt"
        with open(filename_detailed, 'w', encoding='utf-8') as f:
            f.write(f"Thai Transcript for YouTube Video: https://www.youtube.com/watch?v={video_id}\n")
            f.write(f"Language: Thai (auto-generated)\n")
            f.write(f"Format: All timestamps included\n")
            f.write("=" * 70 + "\n\n")
            f.write(detailed_transcript)
        
        print(f"\nFiles saved:")
        print(f"  1. {filename_formatted} (youtube-utils style formatting)")
        print(f"  2. {filename_detailed} (all timestamps included)")
        
        print(f"\nFormatted transcript preview (first 400 characters):")
        print(formatted_transcript[:400] + "..." if len(formatted_transcript) > 400 else formatted_transcript)
        
    except Exception as direct_error:
        print(f"Direct method failed: {direct_error}")
        print("Trying transcript list method with proxy...")
        
        # Fallback: Use transcript list method
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, proxies=proxy_config)
        
        # Find Thai transcript
        thai_transcript = None
        for transcript in transcript_list:
            if transcript.language_code == 'th':
                thai_transcript = transcript
                break
        
        if thai_transcript:
            print(f"Found Thai transcript: {thai_transcript.language} ({'auto-generated' if thai_transcript.is_generated else 'manual'})")
            
            # Fetch the Thai transcript
            transcript_data = thai_transcript.fetch()
            
            # Rest of the processing code...
            # (Same as above but with object attributes instead of dictionary keys)
            print("Processing transcript data with list method...")
            
        else:
            print("No Thai transcript found.")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\nScript finished.")

# To run this script:
# 1. Make sure you have the library installed: pip install youtube-transcript-api
# 2. Execute the script: python test.py

# Replace with your actual API key and a real YouTube video ID
api_key = "AIzaSyBtwQQNW6Bm0mP0VLcRMS4jWDriYgopyVM"
test_video_id = "a_ZOXIikA30"

# result = fetch_youtube_info(test_video_id, api_key)
# print("Result:", result) 