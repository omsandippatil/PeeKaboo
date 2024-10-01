document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    results.innerHTML = 'Processing query...';
    summary.textContent = '';

    // Use Serper for search
    function searchWithSerper(query, numSources = 15) {
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
                throw new Error('Serper API request failed.');
            }
            return response.json();
        })
        .then(data => {
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
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Google Image Search API request failed.');
                }
                return response.json();
            })
            .then(data => {
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

    function getSnippetsForPrompt(snippets) {
        return snippets.map(s => s.snippet).join('\n\n');
    }

    const imagesPromise = searchImagesWithGoogle(query); // Use Google for images
    const resultsPromise = searchWithSerper(query); // Use Serper for text search

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
                    throw new Error('Groq API request failed.');
                }
                return response.json();
            })
            .then(summaryData => {
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
            console.error('Error in promises:', error);
            results.innerHTML = 'Error processing query.';
        });
});
