#!/usr/bin/env python3
"""
Download real photographs from Pexels & Wikimedia Commons for all 284 Badaga vocabulary words with native audio.
Saves standard, web-optimized JPEG files in apps/web/public/vocab-images/{word_id}.jpg.
Uses ThreadPoolExecutor for fast, resilient concurrent downloading with PIL verification.
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

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.vector_store.vocab_store import vocab_store

OUTPUT_DIR = Path(__file__).parent.parent / "apps" / "web" / "public" / "vocab-images"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.pexels.com/",
}

# Rich photographic search query dictionary for all 284 Badaga vocabulary words
SEARCH_MAP = {
    # Body parts (W0001 - W0050)
    "W0001": "human head portrait face",
    "W0002": "human eye macro closeup iris",
    "W0003": "human nose face closeup",
    "W0004": "human mouth smiling lips",
    "W0005": "human ear closeup",
    "W0006": "human hand open palm",
    "W0007": "human legs athletic walking",
    "W0008": "healthy white teeth smile closeup",
    "W0009": "healthy shiny black hair",
    "W0010": "human stomach belly torso",
    "W0011": "human finger pointing closeup",
    "W0012": "expressive human face portrait",
    "W0013": "human tongue tasting",
    "W0014": "human back spine posture",
    "W0015": "human knee joint athletic",
    "W0016": "human chest anatomy torso",
    "W0017": "human neck throat closeup",
    "W0018": "natural human lips mouth",
    "W0019": "smiling human cheek portrait",
    "W0020": "human forehead face closeup",
    "W0021": "human shoulder collarbone",
    "W0022": "human elbow arm joint",
    "W0023": "fingernails clean hand manicure",
    "W0024": "human toes feet pedicure",
    "W0025": "bare human feet walking grass",
    "W0026": "open human palm hand lines",
    "W0027": "thumbs up hand gesture sign",
    "W0028": "natural eye eyebrow closeup",
    "W0029": "long eyelashes eye macro",
    "W0030": "human chin jawline face",
    "W0031": "groomed beard masculine face",
    "W0032": "classic moustache gentleman face",
    "W0033": "smooth healthy skin texture",
    "W0034": "human skeleton bone model",
    "W0035": "red blood drop laboratory medical",
    "W0036": "human navel belly button",
    "W0037": "athletic waist measuring tape",
    "W0038": "human athletic thigh muscles",
    "W0039": "bare human heel foot",
    "W0040": "human wrist pulse checking",
    "W0041": "human ankle joint foot",
    "W0042": "human throat neck voice",
    "W0043": "tear drop crying eye face",
    "W0044": "clean water drops splash",
    "W0045": "sweat drops forehead workout",
    "W0046": "microphone vocal audio singer",
    "W0047": "athletic human body yoga posture",
    "W0048": "human heart anatomical model",
    "W0049": "medical adhesive bandage healing",
    "W0050": "person breathing deep meditation",

    # Family & Society (W0051 - W0099)
    "W0051": "loving indian mother saree portrait",
    "W0052": "smiling indian father portrait",
    "W0053": "elderly indian grandmother saree portrait",
    "W0054": "elderly indian grandfather portrait",
    "W0055": "young indian elder brother portrait",
    "W0056": "young indian elder sister portrait",
    "W0057": "smiling indian younger brother boy",
    "W0058": "smiling indian younger sister girl",
    "W0059": "cute baby infant smiling",
    "W0060": "cheerful happy child smiling",
    "W0061": "indian school boy portrait",
    "W0062": "indian school girl portrait",
    "W0064": "happy indian family three generations",
    "W0065": "adult handsome indian man portrait",
    "W0066": "adult beautiful indian woman portrait",
    "W0067": "smiling middle aged indian man uncle",
    "W0068": "smiling middle aged indian woman aunt",
    "W0069": "dignified elder indian man portrait",
    "W0070": "cheerful friendly indian uncle",
    "W0071": "elderly indian woman saree portrait",
    "W0072": "smiling indian aunt saree portrait",
    "W0073": "indian groom husband portrait",
    "W0074": "indian bride wife portrait saree",
    "W0075": "young indian son teenager smiling",
    "W0076": "young indian daughter smiling",
    "W0077": "little boy grandson smiling",
    "W0078": "little girl granddaughter smiling",
    "W0079": "dignified elderly senior person portrait",
    "W0080": "crowd of happy diverse people",
    "W0082": "friendly neighbours greeting garden",
    "W0083": "indian female teacher classroom blackboard",
    "W0092": "hindu temple priest pooja prayer",
    "W0093": "village elder panchayat leader india",
    "W0094": "respected wise village elder portrait",
    "W0096": "name badge tag identity card",
    "W0097": "historical royal king golden crown",
    "W0098": "royal queen golden crown portrait",
    "W0099": "traditional indian family celebration gathering",

    # House & Furniture (W0101 - W0150)
    "W0101": "cottage village house exterior",
    "W0102": "carved wooden door entrance",
    "W0103": "cottage glass window rustic",
    "W0104": "textured stone brick wall",
    "W0105": "terracotta tiled house roof",
    "W0106": "polished terracotta floor tiles",
    "W0111": "soft comfortable white bed pillow",
    "W0112": "warm cozy knitted blanket",
    "W0118": "outdoor stone staircase steps",
    "W0150": "burlap sack grain storage",

    # Numbers & Quantities (W0701 - W0750)
    "W0701": "single fresh red apple",
    "W0702": "pair of two red apples",
    "W0703": "three fresh colorful flowers",
    "W0704": "four ceramic tea cups",
    "W0705": "five fingers open palm hand",
    "W0706": "six fresh eggs in carton",
    "W0707": "seven colors rainbow sky",
    "W0708": "billiard eight ball pool",
    "W0709": "number nine digit sign",
    "W0710": "ten fingers two open hands",
    "W0711": "abundance plenty fresh fruits basket",
    "W0712": "minimal single green leaf",
    "W0713": "many colorful balloons crowd",
    "W0714": "small pinch of salt spices",
    "W0715": "planet earth globe all together",
    "W0716": "number 11 football jersey",
    "W0717": "wall clock twelve 12 dial",
    "W0718": "number 13 sign digit",
    "W0719": "number 14 gold foil balloon",
    "W0720": "number 15 sign digit",
    "W0721": "number 16 sign",
    "W0722": "number 17 digit",
    "W0723": "number 18 birthday candle",
    "W0724": "number 19 digit sign",
    "W0725": "number 20 celebration sign",
    "W0726": "number 30 sign",
    "W0727": "number 40 sign",
    "W0728": "number 50 golden jubilee sign",
    "W0729": "hundred rupee currency notes money",
    "W0730": "number zero 0 circular ring",
    "W0731": "first place gold medal ribbon",
    "W0732": "second place silver medal",
    "W0733": "marathon runner crossing finish line",
    "W0734": "fresh orange cut in half",
    "W0735": "glass completely full of clean water",
    "W0736": "empty clean white ceramic cup",
    "W0737": "empty clean ceramic plate",
    "W0738": "small handful of roasted almonds",
    "W0739": "wooden alphabet and number blocks",
    "W0740": "pair of leather running shoes",
    "W0741": "slice of delicious chocolate cake",
    "W0742": "heap of bright yellow turmeric spice",
    "W0743": "handful of raw rice grains",
    "W0744": "brass balance scale of justice",
    "W0745": "math plus sign addition symbol",
    "W0746": "math minus subtraction sign",
    "W0747": "row of identical colorful cups",
    "W0748": "single lone yellow flower in green field",
    "W0749": "single solitary gold star",
    "W0750": "two identical twin children",

    # Calendar, Weather, Festivals, Basic actions (W0801 - W0850)
    "W0801": "bright sunny blue sky day",
    "W0802": "starry night sky milky way",
    "W0803": "golden sunrise dawn morning landscape",
    "W0804": "orange sunset evening horizon",
    "W0805": "bright midday sunshine afternoon",
    "W0806": "calendar today date reminder page",
    "W0807": "vintage antique wall calendar",
    "W0808": "dawn rising sun new day morning",
    "W0809": "antique pocket watch ticking time",
    "W0810": "flowing hourglass sand time",
    "W0811": "monsoon rain drops window glass",
    "W0812": "fluffy white cumulus clouds blue sky",
    "W0813": "hot desert sunshine heat shimmering",
    "W0814": "winter frost frozen leaves ice",
    "W0815": "colorful indian festival celebration lights",
    "W0816": "dark stormy storm clouds sky",
    "W0817": "dramatic lightning bolt night storm",
    "W0818": "vibrant rainbow over green hills",
    "W0819": "ocean waves stormy sea weather",
    "W0820": "morning mist fog pine forest mountain",
    "W0821": "winter morning frost on grass",
    "W0822": "sunny summer tropical beach sea",
    "W0823": "snow covered pine trees winter",
    "W0824": "monsoon season green lush hills rain",
    "W0825": "weekly planner calendar schedule",
    "W0826": "desk calendar month pages",
    "W0827": "new year celebration fireworks night",
    "W0828": "classic pendulum clock hour dial",
    "W0829": "golden wrist watch dial timepiece",
    "W0830": "relaxing sunday coffee morning newspaper",
    "W0831": "monday morning workspace desk laptop",
    "W0832": "daily schedule planner notebook",
    "W0833": "calendar planner office desk",
    "W0834": "organizer daily calendar page",
    "W0835": "friday evening weekend happy gathering",
    "W0836": "saturday outdoor park picnic relaxing",
    "W0837": "traditional pongal festival pot sugarcane",
    "W0838": "diwali diya clay oil lamp lights",
    "W0840": "birthday cake lit candles celebration",
    "W0841": "tropical beach holiday vacation hammock",
    "W0842": "traditional indian dholak drum musical",
    "W0843": "national flag waving in blue sky",
    "W0844": "fresh orange marigold flower garland",
    "W0845": "traditional south indian kolam rangoli design",
    "W0846": "sparkling diwali firecrackers festive",
    "W0847": "folded colorful new silk clothes festive",
    "W0848": "classical acoustic guitar notes music",
    "W0849": "traditional bamboo flute bansuri instrument",
    "W0850": "early dawn morning dew sunrise",

    # Daily Life Verbs (W0851 - W0900)
    "W0851": "person eating healthy fresh meal food",
    "W0852": "person drinking glass of fresh water",
    "W0853": "person sleeping peacefully in cozy bed",
    "W0854": "welcoming guest open front door",
    "W0855": "traveler walking with luggage pathway",
    "W0856": "person sitting calmly in wooden chair",
    "W0857": "person standing upright tall posture",
    "W0858": "person walking pathway in nature park",
    "W0859": "runner running jogging outdoor track",
    "W0860": "giving gift present hands charity",
    "W0861": "hand taking fresh ripe fruit basket",
    "W0862": "person looking outward vista landscape",
    "W0863": "crying sad person tears emotional",
    "W0864": "person laughing joyful happy smile",
    "W0865": "washing hands thoroughly with soap water",
    "W0866": "person waking up stretching in morning bed",
    "W0867": "person listening with headphones music",
    "W0868": "person speaking at microphone speech",
    "W0869": "person bathing refreshing shower water",
    "W0870": "person brushing teeth toothbrush bathroom",
    "W0871": "chef cooking fresh food frying pan kitchen",
    "W0872": "person bringing tray carrying food",
    "W0873": "hand placing book on wooden table",
    "W0874": "hand opening wooden door sunlight",
    "W0875": "hand closing rustic wooden door latch",
    "W0876": "person making a phone call talking",
    "W0877": "person waiting patiently bench park",
    "W0879": "person carrying basket shoulder",
    "W0880": "two people holding hands caring",
    "W0881": "pouring fresh water into clear glass",
    "W0884": "person taking off shoes entrance",
    "W0885": "sweeping clean floor with broom",
    "W0887": "buying fresh fruits vegetable market",
    "W0889": "person smelling fresh rose flower scent",
    "W0891": "eating food chewing delicious",
    "W0892": "drinking water swallowing glass",
    "W0893": "child blowing soap bubbles air",
    "W0894": "person biting into crisp red apple",
    "W0896": "water fountain spray clear stream",
    "W0900": "boiling water in tea kettle steam",

    # Actions and Concepts (W0901 - W0952)
    "W0901": "happy children playing football game field",
    "W0902": "joyful person jumping in the air beach",
    "W0903": "person climbing rock mountain trail",
    "W0904": "golden autumn leaves falling tree",
    "W0905": "athlete throwing baseball pitch",
    "W0906": "player catching flying ball hands",
    "W0907": "female singer singing in microphone music",
    "W0908": "indian classical bharatanatyam dancer dancing",
    "W0909": "artist drawing sketch pencil paper",
    "W0910": "hand writing letter fountain pen paper",
    "W0911": "person reading book library cozy",
    "W0912": "counting cash currency coins math",
    "W0913": "storyteller telling story children",
    "W0914": "thumbs up like approval gesture",
    "W0915": "majestic eagle flying in blue sky",
    "W0916": "football player kicking soccer ball",
    "W0917": "person pushing heavy cart forward",
    "W0918": "team pulling rope tug of war",
    "W0919": "young student learning book study",
    "W0920": "thoughtful person thinking deeply portrait",
    "W0921": "illuminated light bulb brilliant idea",
    "W0922": "confused person scratching head remembering",
    "W0923": "student raising hand asking question",
    "W0925": "gardener digging soil shovel garden",
    "W0927": "hand plucking fresh green tea leaves plantation",
    "W0928": "filling water pitcher jug clear stream",
    "W0929": "broken ceramic pottery pieces clean",
    "W0930": "tying knot in rope shoelace hands",
    "W0931": "untying rope knot open hands",
    "W0932": "playful child playing hide and seek tree",
    "W0933": "person searching with magnifying glass",
    "W0934": "discovering treasure chest golden coins",
    "W0935": "person showing presentation chart board",
    "W0936": "audience clapping hands applause concert",
    "W0937": "baker rolling dough with rolling pin",
    "W0938": "two business partners shaking hands deal",
    "W0939": "turning vehicle steering wheel road",
    "W0940": "cute baby crawling on carpet floor",
    "W0941": "two close friends warm loving hug",
    "W0942": "traditional martial arts duel training",
    "W0943": "friendly sports competition match",
    "W0944": "children sharing delicious fruit food",
    "W0945": "champion celebrating victory trophy win",
    "W0946": "runner athlete tired finish second",
    "W0947": "red octagonal stop traffic sign",
    "W0949": "completed checklist tasks checkmark done",
    "W0951": "majestic large indian elephant nature",
    "W0952": "tiny cute ladybug insect green leaf",
}


def search_pexels_photo(query: str, session: requests.Session) -> str | None:
    """Scrapes first crisp, authentic photograph URL from Pexels search."""
    search_url = f"https://www.pexels.com/search/{requests.utils.quote(query)}/"
    try:
        r = session.get(search_url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return None

        # Look for photos
        matches = re.findall(
            r'https://images\.pexels\.com/photos/\d+/pexels-photo-\d+\.(?:jpeg|jpg|png)\?[^"&]+w=\d+',
            r.text,
        )
        if not matches:
            matches = re.findall(
                r'(https://images\.pexels\.com/photos/\d+/[^"\'\s]+)',
                r.text,
            )

        if matches:
            clean = matches[0].replace("&amp;", "&")
            base = re.sub(r'[?].*', '', clean)
            # Fetch 500x375 medium resolution photo
            return f"{base}?auto=compress&cs=tinysrgb&w=500&h=375&fit=crop"

        return None
    except Exception:
        return None


def search_wikimedia_photo(query: str, session: requests.Session) -> str | None:
    """Fallback: Search Wikimedia Commons for authentic photograph."""
    try:
        api_url = (
            f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
            f"&gsrnamespace=6&gsrsearch={requests.utils.quote(query)}"
            f"&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json"
        )
        headers = {"User-Agent": "BadagaLanguageEducationalApp/2.0 (contact@badaga.org)"}
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


def download_and_optimize_image(url: str, out_path: Path, session: requests.Session) -> bool:
    """Downloads image, optimizes with PIL to standard 500x375 JPEG."""
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200 or len(r.content) < 1500:
            return False

        # Verify and process with PIL
        img = Image.open(io.BytesIO(r.content))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize to standard width 500 while preserving aspect ratio
        img.thumbnail((500, 375), Image.Resampling.LANCZOS)

        # Save as high-quality web JPEG
        img.save(out_path, "JPEG", quality=86, optimize=True)
        return True
    except Exception:
        return False


def process_word(item: dict) -> tuple[str, str, bool, str]:
    """Process a single word download."""
    wid = item["wid"]
    eng = item["eng"]
    out_file = OUTPUT_DIR / f"{wid}.jpg"

    # If already downloaded and valid
    if out_file.exists() and out_file.stat().st_size > 4000:
        return (wid, eng, True, "already exists")

    session = requests.Session()
    # Add random slight jitter to be respectful
    time.sleep(random.uniform(0.1, 0.4))

    query = SEARCH_MAP.get(wid) or f"{eng} photograph"

    # Step 1: Pexels search
    img_url = search_pexels_photo(query, session)

    # Step 2: Fallback query if specific query failed
    if not img_url:
        img_url = search_pexels_photo(f"{eng} photo", session)

    # Step 3: Wikimedia fallback
    if not img_url:
        img_url = search_wikimedia_photo(f"{eng} photograph", session)

    # Step 4: Download and save
    if img_url:
        if download_and_optimize_image(img_url, out_file, session):
            size_kb = out_file.stat().st_size / 1024
            return (wid, eng, True, f"{size_kb:.0f} KB")

    return (wid, eng, False, "failed to fetch photo")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load 284 Badaga words with audio
    words_file = Path(__file__).parent / "badaga_audio_words.json"
    if words_file.exists():
        with open(words_file) as f:
            words = json.load(f)
    else:
        items = vocab_store.get_vocabulary(language="badaga", limit=500)
        words = [
            {"wid": it["external_word_id"], "eng": it["english_meaning"], "tam": it["tamil_meaning"]}
            for it in items
            if it.get("audio_assets") and len(it["audio_assets"]) > 0
        ]

    total = len(words)
    print(f"============================================================")
    print(f"  Starting batch download of real photos for {total} Badaga words")
    print(f"  Output directory: {OUTPUT_DIR}")
    print(f"============================================================\n")

    success_count = 0
    failed_words = []

    # Use ThreadPoolExecutor with 6 concurrent workers for fast and safe fetching
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_word, w): w for w in words}
        for i, future in enumerate(as_completed(futures), 1):
            wid, eng, ok, msg = future.result()
            if ok:
                success_count += 1
                status = f"✓ {msg}"
            else:
                failed_words.append((wid, eng))
                status = f"✗ {msg}"
            print(f"[{i:3d}/{total}] {wid:6s} ({eng:22s}) : {status}")

    elapsed = time.time() - start_time
    print(f"\n============================================================")
    print(f"  Completed in {elapsed:.1f} seconds")
    print(f"  Successfully downloaded: {success_count}/{total} real photos")
    if failed_words:
        print(f"  Failed ({len(failed_words)}): {failed_words}")
    print(f"============================================================")


if __name__ == "__main__":
    main()
