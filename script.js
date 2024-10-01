function typeWriterFromJSON(jsonData, element, speed = 5) {
    const content = jsonData.choices[0].message.content;
    const sentences = content.split('\n\n'); // Splitting content into sentences for typewriter effect
    element.innerHTML = ''; // Clearing the element's content

    let i = 0; // Index for sentences
    let j = 0; // Index for characters in a sentence
    let currentSentence = ''; // Store the current sentence being typed
    let isTyping = false; // Track if the typing process is in progress

    function type() {
        // Check if there are more sentences to type
        if (i < sentences.length) {
            if (!isTyping) {
                currentSentence = sentences[i]; // Set current sentence
                isTyping = true; // Mark as typing in progress

                // Create a new paragraph element for each sentence
                const p = document.createElement('p');
                element.appendChild(p);
            }

            const p = element.lastElementChild; // Get the last paragraph added
            const char = currentSentence.charAt(j); // Get the next character to type
            p.innerHTML += char; // Append the character to the paragraph
            j++; // Move to the next character

            // Check if the entire sentence is typed
            if (j >= currentSentence.length) {
                j = 0; // Reset character index
                i++; // Move to the next sentence
                isTyping = false; // Typing for this sentence is done
                setTimeout(type, speed * 2); // Add delay before typing the next sentence
            } else {
                requestAnimationFrame(type); // Continue typing the current sentence
            }
        } else {
            // After typing the text, handle image rendering
            const images = jsonData.images; // Retrieve images from JSON data
            if (images && images.length) {
                const results = document.getElementById('results'); // Select the results container
                results.innerHTML = ''; // Clear previous images

                // Loop through and append images
                images.forEach((img, index) => {
                    const imgElement = document.createElement('img');
                    imgElement.src = img.url; // Set the image URL
                    imgElement.alt = `Image ${index + 1}`; // Set image alt text
                    imgElement.style.display = 'inline-block'; // Inline display for images
                    imgElement.style.width = '200px'; // Set a fixed width for images
                    imgElement.style.height = 'auto'; // Maintain image aspect ratio
                    imgElement.style.marginRight = '10px'; // Add spacing between images
                    results.appendChild(imgElement); // Append image to the results container
                });
            }
        }
    }

    type();
}

document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    const metadata = document.getElementById('metadata');
    results.innerHTML = 'Processing query...';
    summary.textContent = '';
    metadata.textContent = '';

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
        .then(response => response.json())
        .then(data => {
            if (data.organic) {
                return data.organic.map(item => ({
                    url: item.link,
                    snippet: item.snippet || ''
                }));
            }
            return [];
        });
    }

    // Use Google for image search
    function searchImagesWithGoogle(query, numImages = 4) {
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image`;

        return fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    return data.items.map(item => ({
                        url: item.link
                    }));
                }
                return [];
            });
    }

    function getSnippetsForPrompt(snippets) {
        return snippets.map(s => s.snippet).join('\n\n');
    }

    const imagesPromise = searchImagesWithGoogle(query); // Use Google for images
    const resultsPromise = searchWithSerper(query); // Use Serper for text search

    Promise.all([resultsPromise, imagesPromise]).then(([results, images]) => {
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
        fetch('https://api.groq.dev/summarize', {
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
        .then(response => response.json())
        .then(summaryData => {
            jsonData.choices[0].message.content = summaryData.summary; // Update content with summarized data
            typeWriterFromJSON(jsonData, summary);
        });
    });

    function getSuggestions() {
        const suggestions = [
            'What is the capital of France?',
            'How to make a cake?',
            'Explain Einstein\'s theory of relativity.',
            'What are the benefits of exercise?',
            'Tell me a joke.',
            'What is the best programming language?',
            'How to improve mental health?',
            'What is machine learning?',
        ];

        const suggestionsContainer = document.getElementById('suggestions');
        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.textContent = suggestion;
            suggestionElement.className = 'question';
            suggestionElement.addEventListener('click', () => {
                document.getElementById('searchInput').value = suggestion;
                document.getElementById('searchForm').dispatchEvent(new Event('submit'));
            });
            suggestionsContainer.appendChild(suggestionElement);
        });
    }

    getSuggestions();
});
