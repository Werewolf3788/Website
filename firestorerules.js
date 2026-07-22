rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper: Check if active user is Admin (Kevin/Werewolf3788)
    function isAdmin() {
      return isSignedIn() && request.auth.token.email == 'raykevin71888@gmail.com';
    }

    // Helper: Check if the user owns the document matching their UID
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 1. User Profiles & Gamertags (/users/{uid})
    match /users/{userId} {
      allow read: if true; // Public read so operatives can view each other
      allow write: if isOwner(userId) || isAdmin();
    }

    // 2. Master Game Checklists / Public Data
    match /master_games/{gameId} {
      allow read: if true; // Unauthenticated users can view lists
      allow write: if isAdmin(); // Only Admin can write master game data
    }

    // 3. Individual Operative Progress Tracking Data
    match /artifacts/game-tracker-5b2ef/data/public/user/{userName} {
      allow read: if true; // Operatives can cross-view active progress
      
      // Admin override OR authenticated user updating their registered profile
      allow write: if isAdmin() || (
        isSignedIn() && (
          (request.auth.token.email == 'cartnalray9@gmail.com' && userName == 'Ray') ||
          (resource == null || resource.data.userUid == request.auth.uid)
        )
      );
    }
    
    // Default fallback block
    match /{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
