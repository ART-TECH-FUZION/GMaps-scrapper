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
        alert("Koi data nahi mila! Pehle page ko scroll karke results load karein.");
        return;
      }
      exportToCSV(data);
    }
  });
});

function scrapeMapsData() {
  const items = document.querySelectorAll('div[role="feed"] > div');
  const results = [];

  items.forEach(item => {
    // Business Name
    const nameEl = item.querySelector('div.fontHeadlineSmall');
    if (!nameEl) return;
    const name = nameEl.innerText.trim();

    // Website Link
    const websiteEl = item.querySelector('a[aria-label*="website"], a[aria-label*="Website"]');
    const website = websiteEl ? websiteEl.href : 'N/A';

    // Rating (Fixed Query Selector)
    const ratingEl = item.querySelector('span[aria-label*="stars"], span[aria-label*="star"], span[role="img"]');
    const rating = ratingEl ? ratingEl.getAttribute('aria-label') : 'N/A';

    // Phone & Full Text Details
    const textContent = item.innerText || '';
    const phoneMatch = textContent.match(/(\+?\d{1,4}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/);
    const phone = phoneMatch ? phoneMatch[0] : 'N/A';

    results.push({
      name: name,
      phone: phone,
      website: website,
      rating: rating
    });
  });

  return results;
}

// Direct CSV Generator (No external CDN needed)
function exportToCSV(data) {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Business Name,Phone Number,Website,Rating\n";

  data.forEach(row => {
    const cleanName = `"${row.name.replace(/"/g, '""')}"`;
    const cleanPhone = `"${row.phone.replace(/"/g, '""')}"`;
    const cleanWebsite = `"${row.website.replace(/"/g, '""')}"`;
    const cleanRating = `"${row.rating.replace(/"/g, '""')}"`;

    csvContent += `${cleanName},${cleanPhone},${cleanWebsite},${cleanRating}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "gmaps_leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}