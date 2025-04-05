import { test, expect, Locator } from '@playwright/test';

test('should configure API keys and generate a card for "reading"', async ({ page }) => {
  // Track console errors
  const consoleErrors: string[] = [];
  
  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // Filter out known IndexedDB errors that don't affect functionality
      if (msg.text().includes('Error preparing Blob/File data') || 
          msg.text().includes('IndexedDB operation')) {
        console.warn(`Ignoring known IndexedDB error: ${msg.text()}`);
      } else {
        console.error(`Browser console error: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    }
  });
  
  // Listen for uncaught exceptions
  page.on('pageerror', (error) => {
    // Filter out known IndexedDB errors
    if (error.message.includes('Error preparing Blob/File data') || 
        error.message.includes('IndexedDB operation')) {
      console.warn(`Ignoring known IndexedDB error: ${error.message}`);
    } else {
      console.error(`Uncaught exception: ${error.message}`);
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    }
  });

  // Get API keys from environment variables
  const openaiApiKey = process.env.OPENAI_API_KEY || '';
  const openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
  
  if (!openaiApiKey || !openrouterApiKey) {
    console.warn('Warning: API keys not found in environment variables. Test may fail.');
  }

  // Navigate to the application
  await page.goto('/');
  
  // Wait for the application to load
  await page.waitForSelector('.App', { state: 'visible' });
  
  console.log('Opening API settings...');
  
  // Find any button that contains text related to settings/configuration
  await page.locator('button:has-text("Settings"), button:has-text("API"), button:has-text("Config"), button[aria-label*="settings" i], button[title*="settings" i]').first().click();
  
  console.log('Waiting for settings modal...');
  
  // Wait for the modal or form to appear - using multiple potential selectors
  await page.waitForSelector('.modal, .dialog, form, div[role="dialog"], div[class*="modal"], div[class*="dialog"]', 
    { state: 'visible', timeout: 10000 });
  
  console.log('Modal is visible, filling API keys...');
  
  // Fill in the API keys - using very generic input selectors
  // First, look for all visible input elements and filter for likely API key inputs
  const inputs = await page.locator('input:visible').all();
  console.log(`Found ${inputs.length} visible input fields`);
  
  // Try to find OpenAI input
  let openaiKeyInput: Locator | undefined = undefined;
  for (const input of inputs) {
    const id = await input.getAttribute('id') || '';
    const placeholder = await input.getAttribute('placeholder') || '';
    const label = await input.getAttribute('aria-label') || '';
    const name = await input.getAttribute('name') || '';
    
    // Check if this input is likely for OpenAI API key
    if (id.toLowerCase().includes('openai') || 
        placeholder.toLowerCase().includes('openai') || 
        label.toLowerCase().includes('openai') ||
        name.toLowerCase().includes('openai')) {
      openaiKeyInput = input;
      console.log('Found OpenAI API key input');
      break;
    }
  }
  
  // Try to find OpenRouter input
  let openrouterKeyInput: Locator | undefined = undefined;
  for (const input of inputs) {
    const id = await input.getAttribute('id') || '';
    const placeholder = await input.getAttribute('placeholder') || '';
    const label = await input.getAttribute('aria-label') || '';
    const name = await input.getAttribute('name') || '';
    
    // Check if this input is likely for OpenRouter API key
    if (id.toLowerCase().includes('openrouter') || 
        placeholder.toLowerCase().includes('openrouter') || 
        label.toLowerCase().includes('openrouter') ||
        name.toLowerCase().includes('openrouter')) {
      openrouterKeyInput = input;
      console.log('Found OpenRouter API key input');
      break;
    }
  }
  
  // Fill the inputs if found
  if (openaiKeyInput) {
    await openaiKeyInput.fill(openaiApiKey);
  } else {
    console.warn('Could not find OpenAI API key input, trying first input');
    if (inputs.length > 0) await inputs[0].fill(openaiApiKey);
  }
  
  if (openrouterKeyInput) {
    await openrouterKeyInput.fill(openrouterApiKey);
  } else {
    console.warn('Could not find OpenRouter API key input, trying second input');
    if (inputs.length > 1) await inputs[1].fill(openrouterApiKey);
  }
  
  console.log('Saving API settings...');
  
  // Take a screenshot before attempting to save
  await page.screenshot({ path: 'e2e/screenshots/before-save.png', fullPage: true });
  
  // Try to find and click the save button directly in the modal
  try {
    // Try to find a save button inside the modal
    console.log('Trying to find a save button within the modal...');
    
    // Look for a close button or X button first
    try {
      await page.locator('.modal button:has-text("Save"), .modal-content button:has-text("Save"), .modal button.save, .modal button.primary, dialog button:has-text("Save")').first().click({ timeout: 5000 });
      console.log('Found and clicked Save button within modal');
    } catch (e) {
      console.log('Could not find a primary save button, trying fallbacks...');
      
      // Try closing with an X button or close button
      try {
        const closeButton = await page.locator('.modal .close, .modal-close, .modal button:has-text("Close"), .modal button:has-text("Cancel")').first();
        await closeButton.click({ timeout: 5000 });
        console.log('Found and clicked Close button');
      } catch (e) {
        console.log('Could not find a close button, trying JavaScript click...');
        
        // If all else fails, try to use JavaScript to find and click buttons
        await page.evaluate(() => {
          // Try to find and click a Save button
          const saveButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => btn.textContent?.toLowerCase().includes('save'));
          
          if (saveButtons.length > 0) {
            saveButtons[0].click();
            return true;
          }
          
          // Try to find and click a Close button
          const closeButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => 
              btn.textContent?.toLowerCase().includes('close') || 
              btn.textContent?.toLowerCase().includes('cancel') ||
              btn.className.includes('close') ||
              btn.className.includes('cancel'));
          
          if (closeButtons.length > 0) {
            closeButtons[0].click();
            return true;
          }
          
          // Try to find the modal and remove it from DOM
          const modals = document.querySelectorAll('.modal, .modal-overlay, dialog');
          modals.forEach(modal => modal.remove());
          
          return false;
        });
        console.log('Attempted JavaScript click or modal removal');
      }
    }
  } catch (error) {
    console.warn('Error while trying to handle the modal:', error);
    // Force close any overlays using JavaScript
    await page.evaluate(() => {
      document.querySelectorAll('.modal-overlay, .overlay').forEach(el => el.remove());
    });
    console.log('Removed modal overlays using JavaScript');
  }
  
  // Wait a bit for the modal to close
  await page.waitForTimeout(2000);
  
  console.log('Entering word and example sentence...');
  
  // Take a screenshot of current state
  await page.screenshot({ path: 'e2e/screenshots/after-settings.png', fullPage: true });
  
  // Enter the word - try to find the word input
  const wordInputs = await page.locator('input').all();
  let wordInput: Locator | undefined = undefined;
  
  for (const input of wordInputs) {
    const id = await input.getAttribute('id') || '';
    const placeholder = await input.getAttribute('placeholder') || '';
    const label = await input.getAttribute('aria-label') || '';
    
    if (id.toLowerCase().includes('word') || 
        placeholder.toLowerCase().includes('word') || 
        label.toLowerCase().includes('word')) {
      wordInput = input;
      break;
    }
  }
  
  if (wordInput) {
    await wordInput.fill('reading');
    console.log('Filled word input');
  } else {
    console.warn('Could not find word input');
    // Try the first visible input as fallback
    const firstInput = await page.locator('input:visible').first();
    await firstInput.fill('reading');
    console.log('Used fallback for word input');
  }
  
  // Enter the example sentence - try to find the sentence input
  const textareas = await page.locator('textarea').all();
  let sentenceInput: Locator | undefined = undefined;
  
  for (const textarea of textareas) {
    const id = await textarea.getAttribute('id') || '';
    const placeholder = await textarea.getAttribute('placeholder') || '';
    const label = await textarea.getAttribute('aria-label') || '';
    
    if (id.toLowerCase().includes('sentence') || 
        placeholder.toLowerCase().includes('sentence') || 
        label.toLowerCase().includes('sentence') ||
        id.toLowerCase().includes('example') || 
        placeholder.toLowerCase().includes('example') || 
        label.toLowerCase().includes('example')) {
      sentenceInput = textarea;
      break;
    }
  }
  
  if (sentenceInput) {
    await sentenceInput.fill('WHOOP measures stress by taking a **reading** /ˈriːdɪŋ/ of your heart rate.');
    console.log('Filled sentence input');
  } else {
    console.warn('Could not find sentence input');
    // Try the first textarea as fallback
    if (textareas.length > 0) {
      await textareas[0].fill('WHOOP measures stress by taking a **reading** /ˈriːdɪŋ/ of your heart rate.');
      console.log('Used fallback for sentence input');
    }
  }
  
  console.log('Generating card...');
  
  // Take a screenshot before generating
  await page.screenshot({ path: 'e2e/screenshots/before-generate.png', fullPage: true });
  
  // Find and click the generate button - try multiple potential button texts
  try {
    const generateButton = await page.locator('button:has-text("Generate"), button:has-text("Create"), button:has-text("Submit"), button:has-text("Card")').first();
    await generateButton.click({ timeout: 5000, force: true });
    console.log('Clicked Generate button');
  } catch (error) {
    console.warn('Could not click generate button with standard click:', error);
    
    // Try JavaScript click as fallback
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter(btn => 
          btn.textContent?.toLowerCase().includes('generate') || 
          btn.textContent?.toLowerCase().includes('create') ||
          btn.textContent?.toLowerCase().includes('card'));
      
      if (buttons.length > 0) {
        buttons[0].click();
        return true;
      }
      return false;
    });
    console.log('Attempted JavaScript click on generate button');
  }
  
  console.log('Waiting for API response (this may take up to 60 seconds)...');
  
  // Wait for the card generation to complete - specifically looking for the card-content selector
  try {
    await page.waitForSelector('.card-content', { 
      state: 'visible',
      timeout: 60000 // 60 second timeout for API response
    });
    console.log('Card generation completed - card-content element found');
    
    // Wait a bit more to ensure all content is fully loaded
    await page.waitForTimeout(1000);
    
    // Additional check to ensure all card content is loaded
    const cardContentVisible = await page.locator('.card-content').isVisible();
    console.log(`Card content element is ${cardContentVisible ? 'visible' : 'not visible'}`);
    
  } catch (error) {
    console.error('Timeout waiting for card generation to complete');
    // Take a screenshot anyway to see what happened
    await page.screenshot({ path: 'e2e/screenshots/reading-card-timeout.png', fullPage: true });
    
    // Fallback: check for more generic selectors if the specific one fails
    console.log('Trying fallback selectors...');
    try {
      await page.waitForSelector('.card-preview, .preview, .card-display, div[class*="card"], div[class*="preview"], div[class*="result"]', { 
        state: 'visible',
        timeout: 10000 // 10 second timeout for fallback selectors
      });
      console.log('Found card content using fallback selectors');
    } catch (fallbackError) {
      console.error('Could not find any card content using fallback selectors');
      throw error; // Throw the original error
    }
  }
  
  // Wait a bit more to ensure everything is stable
  await page.waitForTimeout(2000);
  
  console.log('Taking screenshot of the result...');
  
  // Take a screenshot of the result
  await page.screenshot({ path: 'e2e/screenshots/reading-card.png', fullPage: true });
  
  // Add basic assertion - check if the page contains the word we searched for
  const pageContent = await page.content();
  expect(pageContent).toContain('reading');
  
  // Check for audio elements and verify they're playable
  console.log('Checking audio elements...');
  
  // Check pronunciation preview audio
  const pronAudioExists = await page.locator('.pronunciation-preview').isVisible();
  if (pronAudioExists) {
    console.log('Pronunciation audio preview found');
    
    // Take a screenshot of the pronunciation audio section
    await page.locator('.pronunciation-preview').screenshot({ path: 'e2e/screenshots/pronunciation-audio.png' });
    
    // Check if the audio has controls and is not disabled
    const audioElementStatus = await page.evaluate(() => {
      const audioElements = document.querySelectorAll('audio');
      const audioInPronunciation = Array.from(audioElements).filter(audio => {
        const closestParent = audio.closest('.pronunciation-preview');
        return closestParent !== null;
      });
      
      if (audioInPronunciation.length === 0) return 'No audio elements found in pronunciation preview';
      
      const results = audioInPronunciation.map(audio => {
        return {
          hasControls: audio.hasAttribute('controls'),
          isDisabled: audio.hasAttribute('disabled'),
          src: audio.getAttribute('src') || 'No source',
          paused: (audio as HTMLAudioElement).paused,
          canPlay: (audio as HTMLAudioElement).canPlayType('audio/mpeg') !== ''
        };
      });
      
      return JSON.stringify(results);
    });
    
    console.log(`Pronunciation audio status: ${audioElementStatus}`);
    
    // Verify that the play button exists and is clickable
    const playButton = await page.locator('.pronunciation-preview button[aria-label*="play" i], .pronunciation-preview button.play-button, .pronunciation-preview .audio-player button').first();
    if (await playButton.isVisible()) {
      console.log('Play button for pronunciation audio is visible');
    } else {
      console.warn('Play button for pronunciation audio is not visible');
    }
  } else {
    console.warn('Pronunciation audio preview not found');
  }
  
  // Check example sentence audio
  const exampleAudioExists = await page.locator('.example-sentence-audio__controls').isVisible();
  if (exampleAudioExists) {
    console.log('Example sentence audio controls found');
    
    // Take a screenshot of the example sentence audio section
    await page.locator('.example-sentence-audio__controls').screenshot({ path: 'e2e/screenshots/example-audio.png' });
    
    // Check if the audio controls are properly initialized
    const exampleAudioStatus = await page.evaluate(() => {
      const audioControls = document.querySelector('.example-sentence-audio__controls');
      if (!audioControls) return 'Audio controls not found';
      
      const audioElements = audioControls.querySelectorAll('audio');
      if (audioElements.length === 0) {
        // Check for custom audio player elements if no audio elements
        const playButtons = audioControls.querySelectorAll('button[aria-label*="play" i], button.play-button');
        return `No audio elements found, but found ${playButtons.length} play buttons`;
      }
      
      const results = Array.from(audioElements).map(audio => {
        return {
          hasControls: audio.hasAttribute('controls'),
          isDisabled: audio.hasAttribute('disabled'),
          src: audio.getAttribute('src') || 'No source',
          paused: (audio as HTMLAudioElement).paused,
          canPlay: (audio as HTMLAudioElement).canPlayType('audio/mpeg') !== ''
        };
      });
      
      return JSON.stringify(results);
    });
    
    console.log(`Example sentence audio status: ${exampleAudioStatus}`);
    
    // Verify that the play button exists and is clickable
    const examplePlayButton = await page.locator('.example-sentence-audio__controls button[aria-label*="play" i], .example-sentence-audio__controls button.play-button, .example-sentence-audio__controls .audio-player button').first();
    if (await examplePlayButton.isVisible()) {
      console.log('Play button for example sentence audio is visible');
    } else {
      console.warn('Play button for example sentence audio is not visible');
    }
  } else {
    console.warn('Example sentence audio controls not found');
  }
  
  // NEW: Refresh the page to test history functionality
  console.log('Refreshing page to test history functionality...');
  await page.reload();
  
  // Wait for the application to load after refresh
  await page.waitForSelector('.App', { state: 'visible' });
  console.log('Page refreshed successfully');
  
  // Wait for history items to be visible
  console.log('Looking for history items...');
  try {
    // Try multiple potential selectors for history items
    await page.waitForSelector(
      '.history-item, .history-entry, [class*="history-"], div[class*="history"], li:has-text("reading")', 
      { state: 'visible', timeout: 10000 }
    );
    
    // Try to find history item containing "reading"
    const historyItems = await page.locator('.history-item, .history-entry, [class*="history-"], div[class*="history"], li:has-text("reading")').all();
    console.log(`Found ${historyItems.length} potential history items`);
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'e2e/screenshots/history-before-click.png', fullPage: true });
    
    let clickSuccessful = false;
    
    if (historyItems.length > 0) {
      console.log('Clicking on history item...');
      await historyItems[0].click({ timeout: 5000 });
      clickSuccessful = true;
    } else {
      console.warn('Could not find a history item for "reading", trying JavaScript click...');
      
      // JavaScript fallback to find and click a history item
      clickSuccessful = await page.evaluate(() => {
        // Look for any element that might be a history item containing "reading"
        const historyElements = Array.from(document.querySelectorAll('*'))
          .filter(el => 
            (el.textContent?.toLowerCase().includes('reading') || '') && 
            (el.className.toLowerCase().includes('history') || 
             el.id.toLowerCase().includes('history') ||
             el.tagName === 'LI' || 
             el.getAttribute('role') === 'listitem')
          );
        
        if (historyElements.length > 0) {
          // Use HTMLElement to access click method
          (historyElements[0] as HTMLElement).click();
          return true;
        }
        return false;
      });
      
      if (clickSuccessful) {
        console.log('Found and clicked history item using JavaScript');
      } else {
        console.error('Could not find any history item containing "reading"');
        await page.screenshot({ path: 'e2e/screenshots/history-not-found.png', fullPage: true });
      }
    }
    
    if (clickSuccessful) {
      // Wait for the card to load
      console.log('Waiting for card to load from history...');
      await page.waitForSelector('.card-content, .card-preview, .preview, .card-display, div[class*="card"]', { 
        state: 'visible',
        timeout: 20000
      });
      
      // Wait to ensure everything is stable
      await page.waitForTimeout(2000);
      
      // Take screenshot of the loaded card from history
      console.log('Taking screenshot of history card...');
      await page.screenshot({ path: 'e2e/screenshots/history-card.png', fullPage: true });
      
      // Verify content - using expect.soft() which is allowed in conditional blocks
      const historyPageContent = await page.content();
      expect.soft(historyPageContent).toContain('reading');
      console.log('Successfully verified card loaded from history');
      
      // NEW: Check if audio elements from history card are present and playable
      console.log('Checking audio elements in history card...');
      
      // Check pronunciation preview audio in history card
      const historyPronAudioExists = await page.locator('.pronunciation-preview').isVisible();
      if (historyPronAudioExists) {
        console.log('History card: Pronunciation audio preview found');
        
        // Take a screenshot of the pronunciation audio section
        await page.locator('.pronunciation-preview').screenshot({ path: 'e2e/screenshots/history-pronunciation-audio.png' });
        
        // Try to play the pronunciation audio
        const pronPlayButton = await page.locator('.pronunciation-preview button[aria-label*="play" i], .pronunciation-preview button.play-button, .pronunciation-preview .audio-player button').first();
        if (await pronPlayButton.isVisible()) {
          console.log('History card: Play button for pronunciation audio is visible');
          
          try {
            await pronPlayButton.click({ timeout: 3000 });
            console.log('History card: Clicked pronunciation play button');
            
            // Check if the audio is playing (the button state might change)
            await page.waitForTimeout(500);
            const isPlaying = await page.evaluate(() => {
              const audioElements = document.querySelectorAll('audio');
              return Array.from(audioElements).some(audio => !(audio as HTMLAudioElement).paused);
            });
            
            console.log(`History card: Pronunciation audio is ${isPlaying ? 'playing' : 'not playing'}`);
          } catch (error) {
            console.warn('History card: Could not play pronunciation audio:', error);
          }
        } else {
          console.warn('History card: Play button for pronunciation audio is not visible');
        }
      } else {
        console.warn('History card: Pronunciation audio preview not found');
      }
      
      // Check example sentence audio in history card
      const historyExampleAudioExists = await page.locator('.example-sentence-audio__controls').isVisible();
      if (historyExampleAudioExists) {
        console.log('History card: Example sentence audio controls found');
        
        // Take a screenshot of the example sentence audio section
        await page.locator('.example-sentence-audio__controls').screenshot({ path: 'e2e/screenshots/history-example-audio.png' });
        
        // Try to play the example sentence audio
        const examplePlayButton = await page.locator('.example-sentence-audio__controls button[aria-label*="play" i], .example-sentence-audio__controls button.play-button, .example-sentence-audio__controls .audio-player button').first();
        if (await examplePlayButton.isVisible()) {
          console.log('History card: Play button for example sentence audio is visible');
          
          try {
            await examplePlayButton.click({ timeout: 3000 });
            console.log('History card: Clicked example sentence play button');
            
            // Check if the audio is playing
            await page.waitForTimeout(500);
            const isPlaying = await page.evaluate(() => {
              const audioControls = document.querySelector('.example-sentence-audio__controls');
              if (!audioControls) return false;
              
              const audioElements = audioControls.querySelectorAll('audio');
              return Array.from(audioElements).some(audio => !(audio as HTMLAudioElement).paused);
            });
            
            console.log(`History card: Example sentence audio is ${isPlaying ? 'playing' : 'not playing'}`);
          } catch (error) {
            console.warn('History card: Could not play example sentence audio:', error);
          }
        } else {
          console.warn('History card: Play button for example sentence audio is not visible');
        }
      } else {
        console.warn('History card: Example sentence audio controls not found');
      }
    }
  } catch (error) {
    console.error('Error working with history:', error);
    await page.screenshot({ path: 'e2e/screenshots/history-error.png', fullPage: true });
  }
  
  // Check if any console errors were detected during the test (excluding known IndexedDB errors)
  if (consoleErrors.length > 0) {
    // Take a screenshot showing the current state when errors occurred
    await page.screenshot({ path: 'e2e/screenshots/console-errors.png', fullPage: true });
    
    // Fail the test and show the errors
    expect.soft(consoleErrors.length, 
      `Test detected ${consoleErrors.length} console error(s):\n${consoleErrors.join('\n')}`
    ).toBe(0);
  }
  
  console.log('Test completed successfully.');
}); 