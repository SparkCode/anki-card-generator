// Tests for CardDisplay extractCardParts function
import React from 'react';
import { render, screen } from '@testing-library/react';

// The function we want to test is inside the CardDisplay component
// Since it's not exported directly, we'll extract it for testing
const extractCardParts = (fullContent) => {
  if (!fullContent) return { front: null, back: null };
  
  const frontPattern = /==front part==([\s\S]*?)==front part==/;
  const backPattern = /==bottom part==([\s\S]*?)==bottom part==/;
  
  const frontMatch = fullContent.match(frontPattern);
  const backMatch = fullContent.match(backPattern);
  
  return {
    front: frontMatch ? frontMatch[1].trim() : null,
    back: backMatch ? backMatch[1].trim() : null,
  };
};

describe('extractCardParts', () => {
  test('returns null for front and back when input is null or empty', () => {
    expect(extractCardParts(null)).toEqual({ front: null, back: null });
    expect(extractCardParts('')).toEqual({ front: null, back: null });
    expect(extractCardParts(undefined)).toEqual({ front: null, back: null });
  });

  test('returns null for front when front part markers are not found', () => {
    const content = 'Some content without front markers but with ==bottom part==content==bottom part==';
    expect(extractCardParts(content)).toEqual({ front: null, back: 'content' });
  });

  test('returns null for back when bottom part markers are not found', () => {
    const content = '==front part==content==front part== Some content without back markers';
    expect(extractCardParts(content)).toEqual({ front: 'content', back: null });
  });

  test('extracts basic front and back parts', () => {
    const content = `==front part==
Front content
==front part==
Some middle content
==bottom part==
Back content
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: 'Front content', 
      back: 'Back content' 
    });
  });

  test('handles multiline content in front and back parts', () => {
    const content = `==front part==
Line 1 front
Line 2 front
Line 3 front
==front part==
Middle content
==bottom part==
Line 1 back
Line 2 back
Line 3 back
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: 'Line 1 front\nLine 2 front\nLine 3 front', 
      back: 'Line 1 back\nLine 2 back\nLine 3 back' 
    });
  });

  test('extracts front and back parts with markdown formatting', () => {
    const content = `==front part==
# Title
**Bold text** and *italic text*
==front part==
Middle content
==bottom part==
## Subtitle
1. List item 1
2. List item 2
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: '# Title\n**Bold text** and *italic text*', 
      back: '## Subtitle\n1. List item 1\n2. List item 2' 
    });
  });

  test('handles nested markers correctly', () => {
    const content = `==front part==
Content with ==nested== markers
==front part==
Middle content
==bottom part==
Content with ==other nested== markers
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: 'Content with ==nested== markers', 
      back: 'Content with ==other nested== markers' 
    });
  });

  test('handles special characters in content', () => {
    const content = `==front part==
Special chars: !@#$%^&*()_+{}[]|\:;"'<>,.?/
==front part==
Middle
==bottom part==
More special: ñáéíóúü¿¡
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: 'Special chars: !@#$%^&*()_+{}[]|:;"\'<>,.?/', 
      back: 'More special: ñáéíóúü¿¡' 
    });
  });

  test('preserves transcription in front part content', () => {
    const content = `==front part==
**abandon** /əˈbændən/ *verb*
==front part==
Middle content
==bottom part==
Back content
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ 
      front: '**abandon** /əˈbændən/ *verb*', 
      back: 'Back content' 
    });
  });

  test('handles edge case with empty content inside markers', () => {
    const content = `==front part==
==front part==
Middle
==bottom part==
==bottom part==`;
    expect(extractCardParts(content)).toEqual({ front: '', back: '' });
  });
}); 