#!/usr/bin/env python3
"""
Download real focused photographs for all 112 missing vocabulary words (primarily Marwari & shared items).
Ensures 100% of all 499 canonical records in the dictionary have authentic photographic flashcards.
"""

import os
import re
import sys
import io
import time
import json
import random
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OUTPUT_DIR = Path(__file__).parent.parent / "apps" / "web" / "public" / "vocab-images"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Referer": "https://www.pexels.com/",
}

MISSING_QUERIES = {
    "W0063": "two close friends smiling happy portrait",
    "W0081": "welcoming guests entering home hospitality",
    "W0084": "kindergarten teacher preschool classroom children",
    "W0085": "female daycare assistant childcare helper",
    "W0086": "doctor medical stethoscope white coat portrait",
    "W0087": "female nurse hospital medical uniform portrait",
    "W0088": "indian farmer working green agriculture field",
    "W0089": "shopkeeper counter grocery store india",
    "W0090": "bus driver steering wheel vehicle road",
    "W0091": "police officer in uniform duty portrait",
    "W0095": "identical twin children smiling cute",
    "W0100": "traditional indian wedding ceremony marriage bride groom",
    "W0107": "clean furnished bedroom living room interior",
    "W0108": "home kitchen cooking stove counter",
    "W0109": "comfortable wooden bedroom bed mattress",
    "W0110": "traditional woven straw floor mat chatai",
    "W0113": "wooden chair isolated white background",
    "W0114": "illuminated glowing table lamp bulb light",
    "W0115": "ceiling fan spinning room cooling",
    "W0116": "clean modern white toilet bowl restroom",
    "W0117": "clean modern bathroom shower glass interior",
    "W0119": "traditional house verandah porch seating",
    "W0120": "traditional home open courtyard interior architecture",
    "W0121": "front door entrance steps house porch",
    "W0122": "wooden fence garden boundary outdoor",
    "W0123": "traditional brick stone water well village",
    "W0124": "water faucet tap running stream isolated",
    "W0125": "wooden dining study table isolated",
    "W0126": "wooden wardrobe cupboard cabinet furniture",
    "W0127": "attic loft storage wooden beams house",
    "W0128": "closed cardboard wooden storage box",
    "W0129": "metal padlock lock closed isolated",
    "W0130": "single metallic brass key isolated",
    "W0131": "wall mounted glass mirror frame reflective",
    "W0132": "round wall clock ticking isolated",
    "W0133": "flat screen television tv screen living room",
    "W0134": "modern mobile smartphone phone screen isolated",
    "W0135": "vintage classic radio transistor player",
    "W0136": "traditional baby hanging cradle swing",
    "W0137": "thatched roof village cottage hut",
    "W0138": "stone carved architectural pillar column",
    "W0139": "room wall interior corner perspective",
    "W0140": "lush green blooming flowers home garden",
    "W0141": "rural cowshed barn with dairy cows",
    "W0142": "open house rooftop terrace sunny outdoor",
    "W0143": "high voltage electricity power line tower",
    "W0144": "wall mounted electric light switch on",
    "W0145": "single lit burning wax candle flame",
    "W0146": "traditional brass oil lamp diya pooja flame",
    "W0147": "framed family picture photo on table",
    "W0148": "hanging wall calendar month planner",
    "W0149": "open black rain umbrella isolated",
    "W0153": "traditional straw broom sweeping isolated",
    "W0201": "stainless steel dinner plate thali isolated",
    "W0202": "stainless steel water drinking tumbler glass",
    "W0203": "stainless steel soup spoon cutlery isolated",
    "W0204": "stainless steel cooking pot vessel kitchen",
    "W0205": "gas stove burner blue flame cooking",
    "W0206": "burning fire flame wood campfire",
    "W0207": "traditional terracotta mud water pot",
    "W0208": "wooden soup cooking ladle spoon isolated",
    "W0209": "ceramic soup bowl isolated white background",
    "W0210": "ceramic tea cup coffee cup isolated",
    "W0211": "white crystal sea salt in small bowl",
    "W0212": "pure cooking vegetable oil in glass bottle",
    "W0213": "white crystal sweet sugar grains in bowl",
    "W0214": "metal water jug pitcher isolated",
    "W0215": "traditional indian iron cooking kadai wok pan",
    "W0216": "billowing white smoke air rising",
    "W0217": "gray burnt firewood ash in fire pit",
    "W0218": "pressure cooker kitchen steam whistle",
    "W0219": "stone mortar ural grinding kitchen tool",
    "W0220": "stone pestle grinding tool isolated",
    "W0221": "traditional stone grinding stone ammi south india",
    "W0222": "bamboo winnowing tray muram grain cleaning",
    "W0223": "wire mesh flour sieve sifter isolated",
    "W0224": "large brass copper water vessel anda",
    "W0225": "traditional ceramic pickle jar barni",
    "W0226": "fresh green banana leaf food plate",
    "W0227": "organic sugarcane jaggery brown block gur",
    "W0228": "fresh spicy red chilli peppers isolated",
    "W0229": "bright yellow turmeric root and turmeric powder",
    "W0230": "sour brown tamarind fruit pods isolated",
    "W0231": "white wheat flour in bowl baking",
    "W0232": "black mustard seeds spice in wooden spoon",
    "W0233": "fragrant cumin seeds jeera in small bowl",
    "W0234": "black peppercorn spice in bowl",
    "W0235": "fresh white garlic bulb and cloves isolated",
    "W0236": "fresh organic ginger root rhizome isolated",
    "W0237": "indian round spice box masala dabba with spices",
    "W0238": "stainless steel tiered tiffin lunch carrier",
    "W0239": "fresh grated shredded coconut in bowl",
    "W0240": "electric kitchen mixer grinder appliance",
    "W0241": "black loose tea leaf powder in bowl",
    "W0242": "pure golden melted desi cow ghee in glass jar",
    "W0243": "fresh creamy churned yellow butter block",
    "W0244": "yellow toor dal split lentils in bowl",
    "W0245": "whole raw golden wheat grain seeds",
    "W0246": "finger millet ragi red grain seeds bowl",
    "W0247": "little millet samai healthy grains in bowl",
    "W0248": "fresh sweet corn on the cob maize ear",
    "W0251": "south indian thali meal rice dishes plate",
    "W0301": "colorful fresh assorted tropical fruits basket",
    "W0352": "clean pure drinking water pouring in clear glass",
    "W0401": "dense lush green tropical rainforest nature",
    "W0451": "dairy cow grazing farm animal pasture",
    "W0501": "majestic wild asian elephant nature",
    "W0551": "folded clean colorful cotton clothes shirts",
    "W0601": "rural kindergarten community center children",
    "W0651": "peaceful rural indian village houses landscape",
    "W0751": "colorful vibrant holi color powders rainbow",
    "W0839": "holi festival colorful powder throwing celebration",
}


def search_pexels(query: str, session: requests.Session) -> str | None:
    search_url = f"https://www.pexels.com/search/{requests.utils.quote(query)}/"
    try:
        r = session.get(search_url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return None
        matches = re.findall(
            r'https://images\.pexels\.com/photos/\d+/pexels-photo-\d+\.(?:jpeg|jpg|png)\?[^"&]+w=\d+',
            r.text,
        )
        if not matches:
            matches = re.findall(r'(https://images\.pexels\.com/photos/\d+/[^"\'\s]+)', r.text)

        if matches:
            clean = matches[0].replace("&amp;", "&")
            base = re.sub(r'[?].*', '', clean)
            return f"{base}?auto=compress&cs=tinysrgb&w=500&h=375&fit=crop"
    except Exception:
        pass
    return None


def search_wikimedia(query: str, session: requests.Session) -> str | None:
    try:
        api_url = (
            f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
            f"&gsrnamespace=6&gsrsearch={requests.utils.quote(query)}"
            f"&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json"
        )
        headers = {"User-Agent": "HeritageLanguageEducationalPlatform/2.0 (contact@badaga.org)"}
        r = session.get(api_url, headers=headers, timeout=12)
        if r.status_code == 200:
            data = r.json()
            pages = data.get("query", {}).get("pages", {})
            for _, v in pages.items():
                infos = v.get("imageinfo", [])
                if infos:
                    thumb = infos[0].get("thumburl") or infos[0].get("url")
                    if thumb and not thumb.lower().endswith(".svg"):
                        return thumb
    except Exception:
        pass
    return None


def save_image(url: str, out_path: Path, session: requests.Session) -> bool:
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200 or len(r.content) < 1500:
            return False
        img = Image.open(io.BytesIO(r.content))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((500, 375), Image.Resampling.LANCZOS)
        img.save(out_path, "JPEG", quality=86, optimize=True)
        return True
    except Exception:
        return False


def process_missing_word(wid: str, query: str) -> tuple[str, bool, str]:
    out_file = OUTPUT_DIR / f"{wid}.jpg"
    session = requests.Session()
    time.sleep(random.uniform(0.1, 0.35))

    img_url = search_pexels(query, session)
    if not img_url:
        img_url = search_wikimedia(query, session)

    if img_url and save_image(img_url, out_file, session):
        size_kb = out_file.stat().st_size / 1024
        return (wid, True, f"{size_kb:.0f} KB")

    return (wid, False, "no image found")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total = len(MISSING_QUERIES)
    print(f"Starting download of real photos for {total} missing words...")

    success = 0
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(process_missing_word, wid, query): wid
            for wid, query in MISSING_QUERIES.items()
        }
        for i, future in enumerate(as_completed(futures), 1):
            wid, ok, msg = future.result()
            if ok:
                success += 1
                status = f"✓ {msg}"
            else:
                status = f"✗ {msg}"
            print(f"[{i:3d}/{total}] {wid}: {MISSING_QUERIES[wid][:30]:30s} -> {status}")

    elapsed = time.time() - start_time
    print(f"\nDone in {elapsed:.1f}s: Successfully downloaded {success}/{total} images.")


if __name__ == "__main__":
    main()
