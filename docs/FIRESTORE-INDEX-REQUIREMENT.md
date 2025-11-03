# Firestore Collection Group Index Requirement

## Important: Single-Field Index Required for Collection Group Queries

When using collection group queries with `orderBy`, Firestore requires a single-field index (NOT a composite index).

### Index Required

For querying submissions across all surveys:
```
Collection Group: submissions
Field: submittedAt (descending)
Type: Single-field index (not composite)
```

### How to Create the Index

**Option 1: Automatic (Recommended)**
1. Run the application
2. Try to query submissions
3. Firestore will automatically create the single-field index if needed
4. You may see an error link - click it and Firebase Console will auto-generate the correct index

**Option 2: Manual - Single Field Index**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Go to the **Single field indexes** section (NOT composite indexes)
5. Find or create index for:
   - Collection ID: `submissions`
   - Query scope: **Collection group** ✓
   - Field: `submittedAt`
   - Order: Descending

**Note:** If you see "this index is not necessary, configure using single field index controls" - this is correct! Single-field indexes are handled differently than composite indexes. The index will be created automatically when you run the query, or you can configure it in the Single field indexes section.

### Collection Structure

**New Structure (Organized):**
```
surveys/{surveyId}/submissions/{submissionId}
```

**Legacy Structure (Backward Compatible):**
```
feedback/{submissionId}
```

The application queries both structures and merges results automatically.

