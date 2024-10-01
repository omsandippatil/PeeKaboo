document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    results.innerHTML = 'Processing query...';
    summary.textContent = '';

    // Use Serper for search
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
                num: numSources
            })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Serper response failed:', response.statusText);
                throw new Error('Serper API request failed.');
            }
            return response.json();
        })
        .then(data => {
            console.log('Serper data:', data);
            if (data.organic) {
                return data.organic.map(item => ({
                    url: item.link,
                    snippet: item.snippet || ''
                }));
            }
            return [];
        })
        .catch(error => {
            console.error('Error fetching from Serper:', error);
            results.innerHTML = 'Error fetching search results.';
            throw error;
        });
    }

    // Use Google for image search
    function searchImagesWithGoogle(query, numImages = 4) {
        console.log('Starting Google Image search with query:', query);
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    console.error('Google Image Search response failed:', response.statusText);
                    throw new Error('Google Image Search API request failed.');
                }
                return response.json();
            })
            .then(data => {
                console.log('Google Image data:', data);
                if (data.items) {
                    return data.items.map(item => ({
                        url: item.link
                    }));
                }
                return [];
            })
            .catch(error => {
                console.error('Error fetching images from Google:', error);
                results.innerHTML = 'Error fetching images.';
                throw error;
            });
    }

    // Perform the searches and process results
    const imagesPromise = searchImagesWithGoogle(query); // Use Google for images
    const resultsPromise = searchWithSerper(query); // Use Serper for text search

    // Processing Promises
    Promise.all([resultsPromise, imagesPromise])
        .then(([results, images]) => {
            console.log('Serper Results:', results);
            console.log('Google Images:', images);

            const jsonData = {
                choices: [
                    {
                        message: {
                            content: getSnippetsForPrompt(results),
                        },
                    },
                ],
                images,
            };

            // Send data to Groq for summarization
            console.log('Sending data to Groq for summarization:', jsonData);
            return fetch('https://api.groq.dev/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama2-70b',
                    data: jsonData.choices[0].message.content
                })
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Groq response failed:', response.statusText);
                    throw new Error('Groq API request failed.');
                }
                return response.json();
            })
            .then(summaryData => {
                console.log('Groq summary data:', summaryData);
                jsonData.choices[0].message.content = summaryData.summary; // Update content with summarized data
                typeWriterFromJSON(jsonData, summary);
            })
            .catch(error => {
                console.error('Error with Groq summarization:', error);
                results.innerHTML = 'Error summarizing the content.';
                throw error;
            });
        })
        .catch(error => {
            console.error('Error in processing the promises:', error);
            results.innerHTML = 'Error processing query.';
        });
});

function getSnippetsForPrompt(snippets) {
    return snippets.map(s => s.snippet).join('\n\n');
}
