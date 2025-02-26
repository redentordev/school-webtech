/**
 * Helper utility functions for fetching and managing user profile data
 */

/**
 * Fetch the user's profile from the API
 * This tries the most reliable method first, then falls back to other methods
 */
export async function fetchUserProfile() {
  try {
    // First try the user profile API
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // If successful, return the data
    if (response.ok) {
      return await response.json();
    }

    // If the main profile API fails, try the sync API as a fallback
    console.log('Main profile API failed, trying sync API...');
    const syncResponse = await fetch('/api/auth/sync-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (syncResponse.ok) {
      const data = await syncResponse.json();
      if (data.success && data.user) {
        return data.user;
      }
    }

    // If both fail, try creating/syncing the profile
    console.log('GET methods failed, trying POST sync...');
    const createResponse = await fetch('/api/auth/sync-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      if (data.success && data.user) {
        return data.user;
      }
    }

    // If all methods fail, throw an error
    throw new Error('Failed to fetch user profile after multiple attempts');
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update the user's profile
 */
export async function updateUserProfile(data: {
  name?: string;
  username?: string;
  bio?: string;
}) {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }

  return await response.json();
} 