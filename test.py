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

# YouTube Shorts video ID from youtube.com/shorts/LXU5ajbcWFY
video_id = "LXU5ajbcWFY" 

print(f"Testing transcript retrieval for YouTube Shorts video ID: {video_id}\n")

transcript_data = None
last_error_message = ""

print(f"Attempting to fetch auto-generated transcript locally (no proxy)")
start_time = time.time()

try:
    # First, let's see what transcripts are available
    print("Checking available transcripts...")
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    available_transcripts = []
    
    for transcript in transcript_list:
        available_transcripts.append({
            'language': transcript.language,
            'language_code': transcript.language_code,
            'is_generated': transcript.is_generated,
            'is_translatable': transcript.is_translatable
        })
    
    print(f"Available transcripts: {available_transcripts}")
    
    if available_transcripts:
        # Try each available transcript
        for transcript_info in available_transcripts:
            lang_code = transcript_info['language_code']
            print(f"\nTrying to fetch {transcript_info['language']} transcript...")
            
            try:
                transcript = transcript_list.find_transcript([lang_code])
                transcript_data_list = transcript.fetch()
                
                # Debug: Check what we actually get
                print(f"Fetched {len(transcript_data_list)} transcript segments")
                if transcript_data_list:
                    print(f"First segment type: {type(transcript_data_list[0])}")
                    print(f"First segment content: {transcript_data_list[0]}")
                
                # Handle the transcript data properly
                if hasattr(transcript_data_list[0], 'text'):
                    # If segments have text attribute
                    transcript_data = "\n".join([segment.text for segment in transcript_data_list])
                else:
                    # If segments are dictionaries
                    transcript_data = "\n".join([segment['text'] for segment in transcript_data_list])
                
                end_time = time.time()
                latency = end_time - start_time
                print(f"Latency: {latency:.4f} seconds")
                print(f"Successfully fetched {transcript_info['language']} transcript!")
                print(f"Number of transcript segments: {len(transcript_data_list)}")
                print(f"Full transcript length: {len(transcript_data)} characters")
                print(f"\nTranscript preview (first 500 characters):")
                print(transcript_data[:500] + "..." if len(transcript_data) > 500 else transcript_data)
                break  # Success, exit the loop
                
            except Exception as transcript_error:
                print(f"Failed to fetch {transcript_info['language']} transcript: {transcript_error}")
                continue
    else:
        print("No transcripts found for this video.")
        
except Exception as e:
    last_error_message = str(e)
    print(f"Failed to access video transcripts: {e}")
    
    # Let's try a more direct approach for common languages
    print("\nTrying direct language approach...")
    for lang in ['en', 'ko']:
        try:
            print(f"Trying {lang}...")
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
            transcript_data = "\n".join([item['text'] for item in transcript_list])
            print(f"Successfully fetched transcript in {lang}!")
            print(f"Transcript length: {len(transcript_data)} characters")
            print(f"Preview: {transcript_data[:300]}...")
            break
        except Exception as lang_error:
            print(f"Failed for {lang}: {lang_error}")

print("\nScript finished.")

# To run this script:
# 1. Make sure you have the library installed: pip install youtube-transcript-api
# 2. Execute the script: python test.py

# Replace with your actual API key and a real YouTube video ID
api_key = "AIzaSyBtwQQNW6Bm0mP0VLcRMS4jWDriYgopyVM"
test_video_id = "a_ZOXIikA30"

# result = fetch_youtube_info(test_video_id, api_key)
# print("Result:", result) 