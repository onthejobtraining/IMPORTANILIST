/**
 * @OnlyCurrentDoc
 * 
 * IMPORTANILIST for Google Sheets
 * Version: 5.0 (Header Mapping & Final Edition)
 *
 * This version uses a configuration map inside the script to define which
 * data to fetch and in what order. This allows the user to have any
 * custom headers in their spreadsheet, in any language.
 */

//================================================================//
//  USER CONFIGURATION
//================================================================//

/*
Instructions:
1.  Set up your spreadsheet with your own custom headers (e.g., "Title", "Year").
2.  In the list below, define the order of the data you want the script to return.
    This order MUST MATCH the order of your spreadsheet columns.
3.  Copy and paste the desired field names from the "Available Fields" list.
*/

/*
Available Fields (for use in the mapping below):
------------------------------------------------------
  'id', 'idMal', 'title.romaji', 'title.english', 'title.native',
  'startDate.year', 'startDate.month', 'startDate.day',
  'endDate.year', 'endDate.month', 'endDate.day',
  'format', 'status', 'episodes', 'duration', 'source',
  'averageScore', 'meanScore', 'popularity', 'favourites',
  'season', 'seasonYear', 'genres', 'synonyms',
  'tags.name', 'studios.nodes.name', 'description',
  'coverImage.large', 'coverImage.extraLarge', 'bannerImage'
*/

// THIS LIST IS THE SINGLE SOURCE OF TRUTH FOR YOUR DATA ORDER.
// It MUST match the order of your custom columns in the spreadsheet.
const FIELD_ORDER_MAPPING = [
  'title.romaji',     // Corresponds to your 1st data column (e.g., Query Title)
  'startDate.year',   // Corresponds to your 2nd data column (e.g., Year)
  'id',               // Corresponds to your 3rd data column (e.g., AniList ID)
  'title.romaji',     // Corresponds to your 4th data column (e.g., Romaji Title)
  'title.english',    // Corresponds to your 5th data column (e.g., English Title)
  'format',           // ...and so on.
  'episodes',
  'status',
  'idMal',
  'seasonYear',
  'averageScore',
  'genres'
];

//================================================================//

// --- Script Constants (No need to edit) ---
const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const CACHE_PREFIX = 'IMPORTANILIST:';
const __MEM_CACHE = {};


/* ===================================================================
 * I. THE PUBLIC FUNCTION
 * =================================================================== */

/**
 * Searches for an anime and returns a single data row that aligns
 * with the FIELD_ORDER_MAPPING configuration.
 * @param {string} title The title of the anime to search for.
 * @param {string|number} [year] Optional. The release year of the anime.
 * @return A single row of data, ordered according to the script's config.
 * @customfunction
 */
function IMPORTANILIST(title, year) {
  if (!title) return; // Return blank if no title
  
  // 1. Build the Query from the Config Map
  // This automatically handles nesting and removes duplicates.
  const uniqueFields = [...new Set(FIELD_ORDER_MAPPING)];
  const queryFields = uniqueFields.map(h => {
    const parts = h.split('.');
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} { ${parts[1]} }`;
    if (parts.length === 3) return `${parts[0]} { ${parts[1]} { ${parts[2]} } }`;
    return '';
  }).join(' ');

  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        ${queryFields}
      }
    }
  `;
  
  const searchQuery = (year) ? `${title} ${year}` : title;
  const variables = { search: searchQuery };

  try {
    // 2. Fetch Data
    const json = _anilist_fetch(query, variables);
    
    // 3. Extract and Flatten Data
    const media = json.data.Media;
    if (!media) {
      // Return a blank row with a "Not Found" message in the first column
      const notFoundRow = FIELD_ORDER_MAPPING.map(() => "");
      notFoundRow[0] = "Not Found";
      return [notFoundRow];
    }
    const flatMedia = _anilist_flattenMediaObject(media);
    
    // 4. Map the results to the configured order and return a single row
    const outputRow = FIELD_ORDER_MAPPING.map(header => flatMedia[header] || "");
    return [outputRow];

  } catch (e) {
    return [[`Error: ${e.message}`]];
  }
}


/* ===================================================================
 * II. CORE HELPERS
 * =================================================================== */

/**
 * A simple flattener purpose-built for the AniList Media object.
 */
function _anilist_flattenMediaObject(mediaObj) {
  const flat = {};
  for (const key in mediaObj) {
    if (mediaObj[key] === null) {
      flat[key] = "";
    } else if (typeof mediaObj[key] === 'object' && !Array.isArray(mediaObj[key])) {
      for (const subKey in mediaObj[key]) {
        if (typeof mediaObj[key][subKey] === 'object' && !Array.isArray(mediaObj[key][subKey])) {
           for (const deepKey in mediaObj[key][subKey]) {
             flat[`${key}.${subKey}.${deepKey}`] = mediaObj[key][subKey][deepKey] || "";
           }
        } else {
          flat[`${key}.${subKey}`] = mediaObj[key][subKey] || "";
        }
      }
    } else if (Array.isArray(mediaObj[key])) {
      flat[key] = mediaObj[key].join(", ");
    } else {
      flat[key] = mediaObj[key];
    }
  }
  return flat;
}


/**
 * Fetches data from cache or network, with a simple retry mechanism.
 */
function _anilist_fetch(query, variables) {
  const body = JSON.stringify({ query, variables });
  
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, body);
  const signature = Utilities.base64Encode(digest);
  const key = CACHE_PREFIX + signature;

  if (__MEM_CACHE[key]) return __MEM_CACHE[key];
  
  const docCache = CacheService.getDocumentCache();
  const cached = docCache.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      __MEM_CACHE[key] = parsed;
      return parsed;
    } catch(e) { /* Corrupted cache */ }
  }

  for (let i = 0; i < 3; i++) {
    try {
      const params = {
        method: 'post',
        contentType: 'application/json',
        payload: body,
        muteHttpExceptions: true
      };
      const resp = UrlFetchApp.fetch(ANILIST_ENDPOINT, params);
      
      if (resp.getResponseCode() === 200) {
        const responseText = resp.getContentText();
        const response = JSON.parse(responseText);
        docCache.put(key, responseText, 3600); // Cache for 1 hour
        __MEM_CACHE[key] = response;
        return response;
      }
    } catch (e) { /* Ignore and retry */ }
    
    if (i < 2) {
      Utilities.sleep(400 * Math.pow(2, i));
    }
  }
  
  throw new Error("Failed to fetch data from AniList after multiple retries.");
}
