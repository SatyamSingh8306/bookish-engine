from langchain_community.tools import TavilySearchResults
from langchain.tools import tool
from typing import Annotated
from app import TAVILY_API_KEY

@tool
def online_search(query: Annotated[str, "Query that you want to search online"]) -> str:
    """Search for online information using Tavily API."""
    tavily = TavilySearchResults(tavily_api_key=TAVILY_API_KEY)
    result = tavily.run(query)
    return result

if __name__ == "__main__":
    ans = online_search.invoke("What is btraking news?")
    print(ans)
