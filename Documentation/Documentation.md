# 🕵️‍♂️ PeeKaboo Project Documentation

## 1. 🎭 Introduction

PeeKaboo is a web-based search application that combines image search, text search, and AI-powered summarization. It provides users with a unique interface to explore and analyze information on various topics, offering a comprehensive search experience by integrating visual and textual data with intelligent summarization.

## 2. 🛠️ Technologies Used

- HTML5 📄
- CSS3 🎨
- JavaScript (ES6+) 🚀
- Google Custom Search API 🔍
- Groq API 🤖

## 3. 🏗️ Project Structure

The entire project is contained within a single `index.html` file, including embedded CSS and JavaScript. This monolithic structure was chosen for simplicity and ease of deployment.

## 4. 📐 HTML Structure

The HTML structure consists of the following main elements:

- `<head>`: Metadata, title, and embedded CSS
- `<body>`:
  - `.container`: Main content wrapper
  - `<h1>`: Page title
  - `#searchForm`: User input form
  - `#suggestions`: Suggested queries container
  - `#results`: Image search results container
  - `#summary`: AI-generated summary container
  - `#metadata`: Search metadata container
  - `<footer>`: Page footer

## 5. 🎨 CSS Styling

Key styling features include:

- Reset styles for consistent rendering
- Custom font import (VT323)
- Responsive design using flexbox
- Dark theme with orange accent color (#FF8C00)
- Custom styling for form elements, images, and text content
- Repeating background image

Notable CSS properties used:
- `box-sizing: border-box;`
- `display: flex;`
- `background-image` with `url()` function
- `border-radius` for rounded corners
- `box-shadow` for depth effects
- `transition` for hover effects

## 6. 🚀 JavaScript Functionality

Main functionalities include:

- Event listener for form submission
- Google Custom Search API integration
- Google Image Search API integration
- Groq API integration for AI summarization
- Dynamic content rendering
- Typewriter effect for summary display

## 7. 🔌 API Integration

### 7.1 Google Custom Search API 🔍

Used for both text and image searches.

Endpoint: `https://www.googleapis.com/customsearch/v1`

Key parameters:
- `key`: API Key
- `cx`: Search Engine ID
- `q`: Search query
- `num`: Number of results
- `searchType`: Set to "image" for image search

### 7.2 Groq API 🤖

Used for AI-powered summarization.

Endpoint: `https://api.groq.com/openai/v1/chat/completions`

Key parameters:
- `model`: AI model to use
- `messages`: Array of message objects
- `temperature`: Creativity of the response
- `max_tokens`: Maximum length of the response

## 8. 🖋️ Font Usage

The project uses the 'VT323' font, imported from Google Fonts:

```css
@font-face {
    font-family: 'VT323';
    src: url('https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJU.woff2') format('woff2');
}
```
## 9. 📦 Dependencies

The PeeKaboo project has no external dependencies or libraries. All functionality is achieved using vanilla HTML, CSS, and JavaScript. This approach keeps the project lightweight and reduces potential compatibility issues.

## 10. 🔧 Functions Overview

The JavaScript code includes several key functions:

### 10.1 typeWriter(text, element, speed)

This function creates a typewriter effect for displaying text. It takes the following parameters:

- `text`: The text to be displayed.
- `element`: The target DOM element.
- `speed`: The speed of the typing effect.

### 10.2 searchWithGoogle(query, numSources)

This function performs a Google Custom Search and returns snippets of search results. Parameters:

- `query`: The search query entered by the user.
- `numSources`: The number of desired sources to return.

### 10.3 searchImagesWithGoogle(query, numImages)

This function performs a Google Image Search and returns image URLs. Parameters:

- `query`: The search query entered by the user.
- `numImages`: The number of desired images to return.

### 10.4 getSnippetsForPrompt(snippets)

This function formats search snippets for use in the AI prompt. It takes an array of snippet objects and returns a formatted string.

### 10.5 setupGetAnswerPrompt(snippets, images)

This function prepares the context for the AI summarization request. Parameters:

- `snippets`: The search snippets.
- `images`: Information about the found images.

### 10.6 requestGroq(query, context, maxTokens, model, temperature)

This function makes a request to the Groq API for AI-powered summarization. Parameters:

- `query`: The original search query.
- `context`: The prepared context for the AI.
- `maxTokens`: Maximum length of the generated summary.
- `model`: The AI model to use.
- `temperature`: Controls the creativity of the AI's response.

## 11. 🐛 Error Handling

Error handling in the PeeKaboo project is implemented using `try-catch` blocks and Promise error catching. When an error occurs:

- It is logged to the console for debugging purposes.
- It is displayed to the user in the results area of the page.

This approach ensures that users are informed of any issues that arise during the search and summarization process.

## 12. ⚡ Performance Considerations

Several measures have been taken to optimize the performance of the PeeKaboo application:

- **Image size control**: Maintains a consistent layout and prevents excessive page reflow.
- **Typewriter effect**: Gradually displays large blocks of text, providing a smoother user experience.
- **Asynchronous API requests**: Prevents blocking the main thread and ensures the UI remains responsive.

## 13. 🔒 Security Considerations

There are a few security considerations to note in the current implementation:

- **API key exposure**: API keys are currently exposed in the client-side code, which is not ideal for production environments. In a real-world scenario, these should be kept server-side.
- **CORS configuration**: Cross-Origin Resource Sharing (CORS) may need to be configured on the server-side for API requests to function correctly in some environments.

## 14. 🚀 Future Enhancements

There are several potential areas for improvement and expansion of the PeeKaboo project:

- Implementation of server-side API key management to improve security.
- Addition of pagination for search results to handle larger result sets.
- More advanced error handling and user feedback mechanisms.
- Improvements to the responsive design to better accommodate various screen sizes and devices.
- Integration of local storage to save recent searches for quick access.
- Implementation of additional search filters and options for more refined searches.

## 15. 🎬 Conclusion

The PeeKaboo project demonstrates the successful integration of multiple APIs and dynamic content generation in a single-page application. Its unique design and functionality provide an engaging user experience for information exploration and analysis.

**Key achievements:**

- Combines image search, text search, and AI-powered summarization.
- Offers users a comprehensive tool for exploring topics of interest.
- Implements a distinctive retro aesthetic with modern functionality.

While there are areas for potential improvement, particularly in terms of security and advanced features, the current implementation serves as a solid foundation for a powerful and user-friendly search application.
