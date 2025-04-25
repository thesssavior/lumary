import requests

def fetch_youtube_info(video_id, api_key):
    url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={api_key}"
    res = requests.get(url)
    if not res.ok:
        print("YouTube API response not ok:", res.status_code, res.text)
        return None
    data = res.json()
    print("Full API response:", data)
    if not data.get("items") or not data["items"]:
        print("YouTube API returned no items:", data)
        return None
    return data["items"]

# Replace with your actual API key and a real YouTube video ID
api_key = "AIzaSyBtwQQNW6Bm0mP0VLcRMS4jWDriYgopyVM"
test_video_id = "a_ZOXIikA30"

result = fetch_youtube_info(test_video_id, api_key)
print("Result:", result) 