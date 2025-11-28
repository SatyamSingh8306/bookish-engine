from langchain.tools import tool
from app.types.web_scrapper import WebScrapperRequest,WebScrapperResponse
from langchain_community.document_loaders import WebBaseLoader,SeleniumURLLoader
import logging 

logger = logging.Logger(logging.INFO)

@tool
async def staticWebScrapper(request : WebScrapperRequest)->WebScrapperResponse:
    """
    Scrapping content from a static website
    example of request format

    request = {
        "urls": ["https://codebysatyam.me","https://github.com/SatyamSingh8306","https://quotes.toscrape.com/js"],
        "description" : ["Scrap content from given website"]
    }
    """
    if request.urls == None:
        logger.error(f"NO url is given by user..")
        return "Nothing found please provide url"
    loader = WebBaseLoader(request.urls)
    results = []
    async for doc in loader.alazy_load():
        results.append(doc.page_content)
    return WebScrapperResponse(response=results)

@tool
async def dynamicWebScrapper(request : WebScrapperRequest)->WebScrapperResponse:
    """Scrapping content from a Dynamic Website"""
    try :
        loader = SeleniumURLLoader(request.urls)
        results = []
        async for doc in loader.alazy_load():
            results.append(doc.page_content)
        return WebScrapperResponse(response=results)
    except Exception as e:
        logger.error(f"Error during dynamic Web Scrapping \n Error : {e}")
        return WebScrapperResponse(response=["Unable to scrape the data"])