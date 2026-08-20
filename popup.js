// Popup khulte hi count check karein
document.addEventListener('DOMContentLoaded', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url.includes("google.com/maps")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.querySelectorAll('div[role="feed"] > div div.fontHeadlineSmall').length
    }, (results) => {
      if (results && results[0]) {
        document.getElementById('leadCount').innerText = results[0].result || 0;
      }
    });
  }
});

// Auto-scroll button logic to fetch all data
document.getElementById('loadMoreBtn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const btn = document.getElementById('loadMoreBtn');
  btn.innerText = "Scrolling...";
  btn.disabled = true;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: autoScrollFeed
  }, () => {
    btn.innerText = "Auto-Scroll Complete!";
    // Recount after scrolling
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.querySelectorAll('div[role="feed"] > div div.fontHeadlineSmall').length
    }, (results) => {
      if (results && results[0]) {
        document.getElementById('leadCount').innerText = results[0].result || 0;
      }
    });
  });
});

// Scrape and Export Button Logic
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("google.com/maps")) {
    alert("Kripya Google Maps open karein!");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeMapsData
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      if (data.length === 0) {
        alert("Koi data nahi mila!");
        return;
      }
      exportToCSV(data);
    }
  });
});

// Function to Scroll Left Panel automatically
async function autoScrollFeed() {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) return;

  await new Promise((resolve) => {
    let totalHeight = 0;
    let distance = 1000;
    let timer = setInterval(() => {
      let scrollHeight = feed.scrollHeight;
      feed.scrollBy(0, distance);
      totalHeight += distance;

      // End of feed search criteria check
      const endText = document.body.innerText.includes("You've reached the end of the list");
      if (totalHeight >= scrollHeight || endText) {
        clearInterval(timer);
        resolve();
      }
    }, 800);
  });
}

// Scrape Data Logic with Mobile / WhatsApp check
function scrapeMapsData() {
  const items = document.querySelectorAll('div[role="feed"] > div');
  const results = [];

  items.forEach(item => {
    const nameEl = item.querySelector('div.fontHeadlineSmall');
    if (!nameEl) return;
    const name = nameEl.innerText.trim();

    const websiteEl = item.querySelector('a[aria-label*="website"], a[aria-label*="Website"]');
    const website = websiteEl ? websiteEl.href : 'N/A';

    const ratingEl = item.querySelector('span[aria-label*="stars"], span[aria-label*="star"], span[role="img"]');
    const rating = ratingEl ? ratingEl.getAttribute('aria-label') : 'N/A';

    const textContent = item.innerText || '';
    const phoneMatch = textContent.match(/(\+?\d{1,4}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : 'N/A';

    // WhatsApp Check Logic (Valid Mobile formats with + or starting 04/05/6/7/8/9)
    let isPossibleWhatsApp = "No";
    if (phone !== 'N/A') {
      const cleanDigits = phone.replace(/\D/g, '');
      // Checks for typical mobile lengths (10 to 12 digits)
      if (cleanDigits.length >= 10 && cleanDigits.length <= 13) {
        isPossibleWhatsApp = "Yes (Mobile)";
      } else {
        isPossibleWhatsApp = "No (Landline/Short)";
      }
    }

    results.push({
      name: name,
      phone: phone,
      whatsapp: isPossibleWhatsApp,
      website: website,
      rating: rating
    });
  });

  return results;
}

// Export function with WhatsApp column
function exportToCSV(data) {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Business Name,Phone Number,WhatsApp Eligible,Website,Rating\n";

  data.forEach(row => {
    const cleanName = `"${row.name.replace(/"/g, '""')}"`;
    const cleanPhone = `"${row.phone.replace(/"/g, '""')}"`;
    const cleanWA = `"${row.whatsapp.replace(/"/g, '""')}"`;
    const cleanWebsite = `"${row.website.replace(/"/g, '""')}"`;
    const cleanRating = `"${row.rating.replace(/"/g, '""')}"`;

    csvContent += `${cleanName},${cleanPhone},${cleanWA},${cleanWebsite},${cleanRating}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "gmaps_leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}