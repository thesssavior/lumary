import requests

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

# Replace with your actual YouTube video ID
# Example video_id known to have ko/en transcripts: "a_ZOXIikA30"
video_id = "a_ZOXIikA30" 

# Proxies from your TypeScript file, with webshare.io updated
proxy_config = [
    {
        "url": 'http://toehivex-rotate:esiwn5hn17xs@p.webshare.io:80/',
        "note": "Webshare with -rotate username"
    },
    {
        "url": 'http://pUUJm81Z0iLPUl2t:G8MtlvbQ73fGcsxh@geo.iproyal.com:12321',
        "note": "iProyal"
    },
    {
        "url": 'http://brd-customer-hl_414d8129-zone-residential_proxy1:yd55dtlsq03w@brd.superproxy.io:33335',
        "note": "Superproxy"
    }
]

transcript_data = None
successful_proxy = None
last_error_message = ""

print(f"Testing transcript retrieval for video ID: {video_id}\n")

for config in proxy_config:
    proxy_url = config["url"]
    note = config["note"]
    proxies = {
        "http": proxy_url,
        "https": proxy_url,
    }
    print(f"Attempting to fetch transcript with proxy: {proxy_url} ({note})")
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(
            video_id, proxies=proxies, languages=['ko', 'en']
        )
        transcript_data = "\n".join([item['text'] for item in transcript_list])
        successful_proxy = proxy_url
        print(f"Successfully fetched transcript using {proxy_url}")
        break  # Exit loop if successful
    except Exception as e:
        last_error_message = str(e)
        print(f"Failed to fetch transcript using {proxy_url}: {e}")

if transcript_data:
    print("\n--- Transcript ---")
    print(transcript_data)
    print(f"--- End of Transcript (fetched with {successful_proxy}) ---")
else:
    print("\n--- Failed to retrieve transcript after trying all proxies ---")
    if last_error_message:
        print(f"Last error: {last_error_message}")

print("\nScript finished.")

# To run this script:
# 1. Make sure you have the library installed: pip install youtube-transcript-api requests
#    (requests is usually a dependency but good to ensure it's there for proxy handling)
# 2. Replace "YOUR_VIDEO_ID_HERE" with an actual YouTube video ID (e.g., "a_ZOXIikA30").
# 3. Execute the script: python test.py

# Replace with your actual API key and a real YouTube video ID
api_key = "AIzaSyBtwQQNW6Bm0mP0VLcRMS4jWDriYgopyVM"
test_video_id = "a_ZOXIikA30"

# result = fetch_youtube_info(test_video_id, api_key)
# print("Result:", result) 