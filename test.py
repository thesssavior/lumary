import openai
import os

# Set your API key
openai.api_key = os.environ["OPENAI_API_KEY"]

# List all available models
models = openai.models.list()

# Log model IDs
for model in models.data:
    print(model.id)