from pydantic import BaseModel, Field
from typing import Optional, List, Annotated


class WebScrapperRequest(BaseModel):
    urls : Annotated[List[str], Field(default=None,description="List of urls need to be searched")]
    description : Annotated[List[str], Field(...,description="Description of what needed to be scrapped")]


class WebScrapperResponse(BaseModel):
    response :Annotated[Optional[List[str]], Field(...,description="Scrapped content by given websites")]