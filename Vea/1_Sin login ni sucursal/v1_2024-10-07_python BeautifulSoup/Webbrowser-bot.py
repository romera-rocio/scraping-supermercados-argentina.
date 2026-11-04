from bs4 import BeautifulSoup
import requests
import time
import webbrowser

#https://www.youtube.com/watch?v=6flMHmg2_Jw&list=PLOkj0YiMMHEavt403KnW9QSo0g250OvWh&index=2

url=requests.get('https://www.vea.com.ar/electro/aire-acondicionado-y-ventilacion')

soup=BeautifulSoup(url.content, "html.parser")
resultado= soup.find("span",{"class":"veaargentina-store-theme-1dCOMij_MzTzZOCohX1K7w"})
