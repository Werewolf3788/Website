rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && request.auth.token.email == 'raykevin71888@gmail.com';
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 1. User Profiles & Gamertags (/users/{uid})
    match /users/{userId} {
      allow read: if true; // Public view
      allow write: if isOwner(userId) || isAdmin(); // Only user or Admin can update profile
    }

    // 2. Universal Progress Records (/user_progress/{userId})
    match /user_progress/{userId} {
      allow read: if true; // Public read across all devices
      allow write: if isOwner(userId) || isAdmin(); // Owner or Admin override
    }

    // Default Fallback
    match /{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
