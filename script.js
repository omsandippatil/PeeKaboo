function typeWriterFromJSON(jsonData, element, speed = 5) {
    const content = jsonData.choices[0].message.content;
    const sentences = content.split('\n\n');
    element.innerHTML = '';

    let i = 0;
    let j = 0;
    let currentSentence = '';
    let isTyping = false;

    function type() {
        if (i < sentences.length) {
            if (!isTyping) {
                currentSentence = sentences[i];
                isTyping = true;
                // Create a new paragraph element
                const p = document.createElement('p');
                element.appendChild(p);
            }

            const p = element.lastElementChild;
            const char = currentSentence.charAt(j);
            p.innerHTML += char;
            j++;

            if (j >= currentSentence.length) {
                j = 0;
                i++;
                isTyping = false;
                setTimeout(type, speed * 2);
            } else {
                requestAnimationFrame(type);
            }
        } else {
            const images = jsonData.images;
            if (images && images.length) {
                images.forEach((img, index) => {
                    const imgElement = document.createElement('img');
                    imgElement.src = img.url;
                    imgElement.alt = `Image ${index + 1}`;
                    imgElement.style.display = 'block';
                    imgElement.style.marginTop = '10px';
                    element.appendChild(imgElement);
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

    function searchWithGoogle(query, numSources = 15) {
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numSources}`;

        return fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    return data.items.map(item => ({
                        url: item.link,
                        snippet: item.snippet || '',
                    }));
                }
                return [];
            });
    }

    function searchImagesWithGoogle(query, numImages = 4) {
        const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numImages}&searchType=image`;

        return fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.items) {
                    return data.items.map(item => ({
                        url: item.link,
                    }));
                }
                return [];
            });
    }

    function getSnippetsForPrompt(snippets) {
        return snippets.map(s => s.snippet).join('\n\n');
    }

    const imagesPromise = searchImagesWithGoogle(query);
    const resultsPromise = searchWithGoogle(query);

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
        typeWriterFromJSON(jsonData, summary);
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
