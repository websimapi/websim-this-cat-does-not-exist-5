const { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } = React;
const { createRoot } = ReactDOM;

const App = () => {
  const [room] = useState(() => new WebsimSocket());
  const [generating, setGenerating] = useState(false);
  const [previewStory, setPreviewStory] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const inputRef = useRef(null);

  // Get cats from the database
  const cats = useSyncExternalStore(
    room.collection('cat').subscribe,
    room.collection('cat').getList
  );

  // Function to generate cat story based on the prompt
  const generateCatStory = async (userPrompt) => {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a creative writer specializing in describing fictional, often whimsical cats that do not exist. 
          Create a short, vivid and imaginative description of a cat based on the user's prompt.
          Include details about its appearance, personality, habits, and any special abilities or quirks.
          Keep the tone light and entertaining. Limit your response to 150 words maximum.
          The description should be detailed enough to inspire an AI image generator.`
        },
        {
          role: "user",
          content: userPrompt || "Generate a random, interesting cat that doesn't exist"
        }
      ]
    });
    
    return completion.content.trim();
  };

  // Function to generate cat image based on the story
  const generateCatImage = async (story) => {
    const imagePrompt = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert at converting text descriptions into detailed image generation prompts.
          Take the following cat description and create a detailed prompt for an image generator.
          Focus on visual aspects like color, pattern, pose, environment, lighting, and style.
          Create a prompt that would result in a realistic or stylized cat image based on the description.
          Format: detailed image prompt only, no explanations.`
        },
        {
          role: "user",
          content: story
        }
      ]
    });
    
    const finalPrompt = "A cat that does not exist: " + imagePrompt.content.trim();
    
    const imageResult = await websim.imageGen({
      prompt: finalPrompt,
      aspect_ratio: "1:1",
    });
    
    return imageResult.url;
  };

  // Function to generate both story and image
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setPreviewStory('');
      setPreviewImage('');
      
      const story = await generateCatStory(prompt);
      setPreviewStory(story);
      
      const imageUrl = await generateCatImage(story);
      setPreviewImage(imageUrl);
      
      setGenerating(false);
    } catch (error) {
      console.error('Error generating cat:', error);
      setGenerating(false);
    }
  };

  // Function to save the generated cat to the database
  const handleSave = async () => {
    if (!previewStory || !previewImage) return;
    
    try {
      await room.collection('cat').create({
        story: previewStory,
        image_url: previewImage,
        prompt: prompt || 'Random cat',
      });
      
      // Clear preview after saving
      setPreviewStory('');
      setPreviewImage('');
      setPrompt('');
      
      // Focus back on input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Error saving cat:', error);
    }
  };

  // Sort the cats based on the selected order
  const sortedCats = useMemo(() => {
    if (!cats) return [];
    
    const catsArray = [...cats];
    
    if (sortOrder === 'newest') {
      return catsArray;  // Already sorted by newest first from the API
    } else if (sortOrder === 'oldest') {
      return catsArray.reverse();
    }
    
    return catsArray;
  }, [cats, sortOrder]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>This Cat Does Not Exist</h1>
        <p>Generate fictional cats with AI and share them with the world</p>
      </header>
      
      <main>
        <section className="generator">
          <div className="input-section">
            <div className="input-group">
              <label htmlFor="prompt">Describe the cat you want to generate (or leave blank for a random cat)</label>
              <input
                ref={inputRef}
                type="text"
                id="prompt"
                placeholder="e.g., A cosmic space cat with galaxy fur"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
              />
            </div>
          </div>
          
          <div className="generator-buttons">
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Cat'}
            </button>
            
            {previewStory && previewImage && (
              <button 
                className="btn btn-secondary"
                onClick={handleSave}
              >
                Save to Gallery
              </button>
            )}
          </div>
          
          {generating && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Generating your fictional cat...</p>
            </div>
          )}
          
          {previewStory && previewImage && (
            <div className="preview">
              <h3>Preview</h3>
              <p>{previewStory}</p>
              <img src={previewImage} alt="Generated cat preview" />
            </div>
          )}
        </section>
        
        <section className="gallery-section">
          <div className="gallery">
            <div className="gallery-header">
              <h2>Cat Gallery</h2>
              <div className="gallery-filters">
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
            
            {sortedCats.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path fill="currentColor" d="M290.59 192c-20.18 0-106.82 1.98-162.59 85.95V192c0-52.94-43.06-96-96-96-17.67 0-32 14.33-32 32s14.33 32 32 32c17.64 0 32 14.36 32 32v256c0 35.3 28.7 64 64 64h176c8.84 0 16-7.16 16-16v-16c0-17.67-14.33-32-32-32h-32l128-96v144c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16V289.86c-10.29 2.67-20.89 4.54-32 4.54-61.81 0-113.52-44.05-125.41-102.4zM448 96h-64l-64-64v134.4c0 53.02 42.98 96 96 96s96-42.98 96-96V32l-64 64zm-72 80c-8.84 0-16-7.16-16-16s7.16-16 16-16 16 7.16 16 16-7.16 16-16 16zm80 0c-8.84 0-16-7.16-16-16s7.16-16 16-16 16 7.16 16 16-7.16 16-16 16z"/>
                </svg>
                <p>No cats have been generated yet. Be the first to add one!</p>
              </div>
            ) : (
              sortedCats.map((cat) => (
                <div key={cat.id} className="gallery-card">
                  <div className="gallery-card-image">
                    <img src={cat.image_url} alt="AI generated cat" />
                  </div>
                  <div className="gallery-card-content">
                    <div className="gallery-card-description">{cat.story}</div>
                    <div className="gallery-card-meta">
                      <div className="gallery-card-author">
                        <img 
                          src={`https://images.websim.ai/avatar/${cat.username}`} 
                          alt={cat.username} 
                          className="user-avatar" 
                        />
                        {cat.username}
                      </div>
                      <div>
                        {new Date(cat.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);

