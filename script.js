document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    results.innerHTML = 'Processing query...';
    summary.textContent = '';

    // Use Serper for latest web search
    function searchWithSerper(query, numSources = 15) {
        console.log('Starting Serper search with query:', query);
        return fetch(`https://api.serper.dev/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SERPER_API_KEY}`
            },
            body: JSON.stringify({
                q: query,
                num: numSources,
                tbs: 'qdr:d' // This parameter requests results from the past 24 hours
            })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Serper response failed:', response.status, response.statusText);
                throw new Error(`Serper API request failed: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Serper data:', data);
            if (data.organic && data.organic.length > 0) {
                return data.organic.map(item => ({
                    url: item.link,
                    snippet: item.snippet || '',
                    title: item.title || '',
                    date: item.date || 'Recent'
                }));
            }
            throw new Error('No organic results found in Serper response');
        })
        .catch(error => {
            console.error('Error fetching from Serper:', error);
            throw error;
        });
    }

    // Use Google for latest image search
    function searchImagesWithGoogle(query, numImages = 4) {
        console.log('Starting Google Image search with query:', query);
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image&sort=date`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    console.error('Google Image Search response failed:', response.status, response.statusText);
                    throw new Error(`Google Image Search API request failed: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Google Image data:', data);
                if (data.items && data.items.length > 0) {
                    return data.items.map(item => ({
                        url: item.link,
                        title: item.title || '',
                        date: item.image.contextLink || 'Recent'
                    }));
                }
                throw new Error('No image results found in Google response');
            })
            .catch(error => {
                console.error('Error fetching images from Google:', error);
                throw error;
            });
    }

    // Perform the searches and process results
    Promise.all([
        searchWithSerper(query).catch(error => {
            console.error('Serper search failed:', error);
            return [];
        }),
        searchImagesWithGoogle(query).catch(error => {
            console.error('Google Image search failed:', error);
            return [];
        })
    ])
    .then(([textResults, imageResults]) => {
        if (textResults.length === 0 && imageResults.length === 0) {
            throw new Error('Both text and image searches failed to return results');
        }

        console.log('Serper Results:', textResults);
        console.log('Google Images:', imageResults);

        const context = prepareContext(textResults, imageResults);

        // Send data to Groq for summarization with context
        console.log('Sending data to Groq for summarization:', context);
        return fetch('https://api.groq.dev/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama2-70b',
                prompt: `Summarize the following information, focusing on the most recent and relevant details. Highlight any notable recent developments or changes:\n\n${context}`
            })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Groq response failed:', response.status, response.statusText);
                throw new Error(`Groq API request failed: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(summaryData => {
            console.log('Groq summary data:', summaryData);
            if (!summaryData.summary) {
                throw new Error('No summary provided in Groq response');
            }
            typeWriter(summaryData.summary, summary);
            displayResults(textResults, imageResults, results);
        });
    })
    .catch(error => {
        console.error('Error in processing the query:', error);
        results.innerHTML = `Error processing query: ${error.message}. Please try again or contact support if the problem persists.`;
    });
});

function prepareContext(snippets, images) {
    let context = "Web Search Results:\n";
    snippets.forEach((s, index) => {
        context += `${index + 1}. ${s.title} (${s.date})\n${s.snippet}\n\n`;
    });
    
    context += "\nRecent Images:\n";
    images.forEach((img, index) => {
        context += `${index + 1}. ${img.title} (${img.date})\n`;
    });
    
    return context;
}

function typeWriter(text, element, index = 0) {
    if (index < text.length) {
        element.textContent += text.charAt(index);
        setTimeout(() => typeWriter(text, element, index + 1), 20);
    }
}

function displayResults(textResults, imageResults, container) {
    container.innerHTML = '';
    
    // Display text results
    if (textResults.length > 0) {
        const textResultsDiv = document.createElement('div');
        textResultsDiv.innerHTML = '<h3>Web Search Results:</h3>';
        textResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `
                <h4><a href="${result.url}" target="_blank">${result.title}</a></h4>
                <p>${result.snippet}</p>
                <small>Date: ${result.date}</small>
            `;
            textResultsDiv.appendChild(resultDiv);
        });
        container.appendChild(textResultsDiv);
    }
    
    // Display image results
    if (imageResults.length > 0) {
        const imageResultsDiv = document.createElement('div');
        imageResultsDiv.innerHTML = '<h3>Recent Images:</h3>';
        imageResultsDiv.style.display = 'flex';
        imageResultsDiv.style.flexWrap = 'wrap';
        imageResults.forEach(image => {
            const imgDiv = document.createElement('div');
            imgDiv.style.margin = '10px';
            imgDiv.innerHTML = `
                <img src="${image.url}" alt="${image.title}" style="max-width: 200px; max-height: 200px;">
                <p>${image.title}</p>
                <small>Date: ${image.date}</small>
            `;
            imageResultsDiv.appendChild(imgDiv);
        });
        container.appendChild(imageResultsDiv);
    }

    if (textResults.length === 0 && imageResults.length === 0) {
        container.innerHTML = 'No results found. Please try a different query.';
    }
}
