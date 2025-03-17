// Global variables
let currentAyah = { surah: 1, verse: 1 };
let surahNames = [];
let verseCounts = [];

// Load Surah metadata from API on startup
fetch("https://api.alquran.cloud/v1/meta")
  .then((response) => response.json())
  .then((data) => {
    surahNames = data.data.surahs.references.map((ref) => ref.englishName);
    verseCounts = data.data.surahs.references.map((ref) => ref.numberOfAyahs);
    loadVerse(currentAyah.surah, currentAyah.verse);
  })
  .catch((err) => console.error("Error fetching metadata:", err));

// Load a specific verse (Arabic, transliteration, translation) and update the UI
function loadVerse(surah, verse) {
  // Show loading indicator
  document.getElementById("loading").style.display = "block";

  // Update the search input and current ayah tracking
  document.getElementById("search").value = `${surah}-${verse}`;
  currentAyah = {
    surah,
    verse,
    audioUrl: `https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/${
      (surah - 1) * 1000 + verse
    }`,
  };

  // Update the audio player source
  document.getElementById("audioPlayer").src = currentAyah.audioUrl;

  // First, fetch the basic verse data (arabic, transliteration, translation)
  Promise.all([
    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/ar`),
    fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${verse}/en.transliteration`
    ),
    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/en.sahih`),
  ])
    .then((responses) => Promise.all(responses.map((res) => res.json())))
    .then(([arabicData, translitData, transData]) => {
      // Update Arabic text
      document.getElementById("arabic").innerText = arabicData.data.text;

      // Update the transliteration text in the pronunciation section
      document.getElementById("transliteration").innerText =
        translitData.data.text;

      // Update header information
      document.querySelector(".surah-info").innerText = `Surah ${
        surahNames[surah - 1]
      } | Verse ${verse}`;

      // Now fetch the word-by-word data from Quran.com API
      return fetch(
        `https://api.quran.com/api/v4/verses/by_key/${surah}:${verse}?words=true&translations=131&word_fields=text_uthmani,transliteration&fields=text_uthmani`
      )
        .then((response) => response.json())
        .catch((err) => {
          console.error("Error fetching word-by-word data:", err);
          // Return null to indicate we should use fallback
          return null;
        });
    })
    .then((wordData) => {
      if (!wordData || !wordData.verse || !wordData.verse.words) {
        // Use fallback method if we couldn't get word-by-word data
        return fallbackWordByWord(surah, verse);
      }

      const words = wordData.verse.words;

      // Update word-by-word table dynamically
      const tbody = document.getElementById("word-table-body");
      tbody.innerHTML = "";

      words.forEach((word) => {
        if (word.char_type_name !== "end") {
          // Skip end-of-verse markers
          const row = document.createElement("tr");

          // Arabic word
          const arabicCell = document.createElement("td");
          arabicCell.textContent = word.text_uthmani;
          arabicCell.dir = "rtl"; // Set direction to right-to-left
          arabicCell.className = "arabic-word";
          row.appendChild(arabicCell);

          // Transliteration
          const translitCell = document.createElement("td");
          translitCell.textContent = word.transliteration?.text || "";
          row.appendChild(translitCell);

          // Translation
          const transCell = document.createElement("td");
          transCell.textContent = word.translation?.text || "";
          row.appendChild(transCell);

          tbody.appendChild(row);
        }
      });

      // Hide loading indicator
      document.getElementById("loading").style.display = "none";

      // Also fetch and update the tafsir
      return fetch(
        `https://api.quran.com/api/v4/tafsirs/en-tafisr-ibn-kathir/by_ayah/${surah}:${verse}`
      )
        .then((response) => response.json())
        .catch((err) => {
          console.error("Error fetching tafsir:", err);
          return {
            tafsirs: [{ text: "Tafsir not available for this verse." }],
          };
        });
    })
    .then((tafsirData) => {
      if (tafsirData && tafsirData.tafsirs && tafsirData.tafsirs.length > 0) {
        document.getElementById("tafsir-text").innerHTML =
          tafsirData.tafsirs[0].text;
      } else {
        document.getElementById("tafsir-text").innerHTML =
          "Tafsir not available for this verse.";
      }
    })
    .catch((err) => {
      console.error("Error in verse loading process:", err);
      // Fallback to basic word splitting as a last resort
      fallbackWordByWord(surah, verse);
    });
}

// Fallback function for word-by-word when API fails
function fallbackWordByWord(surah, verse) {
  return Promise.all([
    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/ar`),
    fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${verse}/en.transliteration`
    ),
    fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/en.sahih`),
  ])
    .then((responses) => Promise.all(responses.map((res) => res.json())))
    .then(([arabicData, translitData, transData]) => {
      // Update Arabic text if not already updated
      document.getElementById("arabic").innerText = arabicData.data.text;
      document.getElementById("transliteration").innerText =
        translitData.data.text;

      // Split the text into words
      const arabicWords = arabicData.data.text.split(/\s+/);
      const translitWords = translitData.data.text.split(/\s+/);
      const transWords = transData.data.text.split(/\s+/);

      // Get the maximum length to ensure we have enough cells
      const maxLength = Math.max(
        arabicWords.length,
        translitWords.length,
        transWords.length
      );

      // Update the table
      const tbody = document.getElementById("word-table-body");
      tbody.innerHTML = "";

      for (let i = 0; i < maxLength; i++) {
        const row = document.createElement("tr");

        // Arabic word
        const arabicCell = document.createElement("td");
        arabicCell.textContent = arabicWords[i] || "";
        arabicCell.dir = "rtl"; // Set direction to right-to-left
        arabicCell.className = "arabic-word";
        row.appendChild(arabicCell);

        // Transliteration
        const translitCell = document.createElement("td");
        translitCell.textContent = translitWords[i] || "";
        row.appendChild(translitCell);

        // Translation (this is approximate and may not match perfectly)
        const transCell = document.createElement("td");
        transCell.textContent = transWords[i] || "";
        row.appendChild(transCell);

        tbody.appendChild(row);
      }

      // Hide loading indicator
      document.getElementById("loading").style.display = "none";

      // Return null to indicate we have no tafsir data
      return null;
    })
    .catch((err) => {
      console.error("Error in fallback word-by-word:", err);
      document.getElementById("loading").style.display = "none";
      alert("Error loading verse data. Please try again later.");
      return null;
    });
}

// Font size cycling: Small, Medium, Large (in em units)
const fontSizes = [1.5, 2, 2.5];
let currentSizeIndex = 0;
function cycleFontSize() {
  currentSizeIndex = (currentSizeIndex + 1) % fontSizes.length;
  document.getElementById("arabic").style.fontSize =
    fontSizes[currentSizeIndex] + "em";
}

// Audio Playback using the hidden audio element
function playAudio() {
  const audioPlayer = document.getElementById("audioPlayer");
  audioPlayer.src = currentAyah.audioUrl;
  audioPlayer.currentTime = 0;
  audioPlayer.play();
}

// Toggle the display of the Tafsir text
function toggleTafsir() {
  const tafsirText = document.getElementById("tafsir-text");
  tafsirText.style.display =
    tafsirText.style.display === "none" ? "block" : "none";
}

// Navigation: Previous/Next Verse
function navigateVerse(direction) {
  let newVerse = currentAyah.verse + direction;
  let newSurah = currentAyah.surah;
  if (newVerse < 1) {
    newSurah--;
    if (newSurah < 1) return;
    newVerse = verseCounts[newSurah - 1];
  } else if (newVerse > verseCounts[currentAyah.surah - 1]) {
    newSurah++;
    if (newSurah > 114) return;
    newVerse = 1;
  }
  loadVerse(newSurah, newVerse);
}

// Navigation: Simulated Previous/Next Ruku (approx. 3 verses per Ruku)
function navigateRuku(direction) {
  const offset = 3;
  let newVerse = currentAyah.verse + direction * offset;
  let newSurah = currentAyah.surah;
  if (newVerse < 1) {
    newSurah--;
    if (newSurah < 1) return;
    newVerse = verseCounts[newSurah - 1] + newVerse; // newVerse is negative here
  } else if (newVerse > verseCounts[currentAyah.surah - 1]) {
    newSurah++;
    if (newSurah > 114) return;
    newVerse = newVerse - verseCounts[currentAyah.surah - 1];
  }
  loadVerse(newSurah, newVerse);
}

// Navigation: Previous/Next Surah (loads first verse of that Surah)
function navigateSurah(direction) {
  let newSurah = currentAyah.surah + direction;
  if (newSurah >= 1 && newSurah <= 114) {
    loadVerse(newSurah, 1);
  }
}

// Navigate based on search input (format: "surah-verse")
function navigateToVerse() {
  const input = document.getElementById("search").value.split("-");
  const surah = parseInt(input[0]);
  const verse = parseInt(input[1]);
  if (
    surah >= 1 &&
    surah <= 114 &&
    verse >= 1 &&
    verse <= verseCounts[surah - 1]
  ) {
    loadVerse(surah, verse);
  } else {
    alert("Invalid Surah or Verse number");
  }
}
