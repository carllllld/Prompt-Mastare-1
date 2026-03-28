# Implementation Tasks

## Task Breakdown

### Phase 1: Backend Foundation

#### Task 1.1: Extract Expert Analysis Module
**Status**: pending
**Priority**: high
**Estimated Effort**: 4 hours

**Description**: Extract expert analysis logic from routes.ts into reusable module

**Subtasks**:
- [ ] Create `server/lib/expert-analysis.ts`
- [ ] Move broker analysis logic to new module
- [ ] Move lawyer analysis logic to new module
- [ ] Add text span detection function
- [ ] Add auto-fix generation function
- [ ] Export `runExpertAnalysis()` function
- [ ] Update routes.ts to use new module
- [ ] Add unit tests for expert analysis

**Dependencies**: None

**Acceptance Criteria**:
- Expert analysis can be called independently
- Text spans are correctly detected
- Auto-fixes are generated for actionable items
- All existing tests pass

---

#### Task 1.2: Create Hemnet Analysis Endpoint
**Status**: pending
**Priority**: high
**Estimated Effort**: 3 hours

**Description**: Create new API endpoint for analyzing Hemnet listings

**Subtasks**:
- [ ] Add route: POST /api/integrations/hemnet/analyze
- [ ] Implement request validation (Zod schema)
- [ ] Reuse fetchHemnetProperty() from hemnet-integration.ts
- [ ] Extract description text from property
- [ ] Call runExpertAnalysis() with text
- [ ] Return analysis results
- [ ] Add error handling for edge cases
- [ ] Add integration tests

**Dependencies**: Task 1.1

**Acceptance Criteria**:
- Endpoint accepts valid Hemnet URLs
- Returns analysis with feedback items
- Handles errors gracefully
- Respects rate limits

---

#### Task 1.3: Add Analysis Quota Tracking
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Track Hemnet analysis usage separately from text generation

**Subtasks**:
- [ ] Add database migration for hemnet_analyses_used column
- [ ] Update usage_tracking schema in shared/schema.ts
- [ ] Update PLAN_LIMITS with analysis quotas
- [ ] Implement checkAnalysisQuota() function
- [ ] Implement trackAnalysisUsage() function
- [ ] Update /api/user/status to include analysis quota
- [ ] Add tests for quota enforcement

**Dependencies**: None

**Acceptance Criteria**:
- Analysis quota tracked separately
- Quota enforced per plan tier
- User status shows remaining analyses
- Quota resets monthly

---

#### Task 1.4: Create Improved Version Generator
**Status**: pending
**Priority**: medium
**Estimated Effort**: 2 hours

**Description**: Generate improved text version with accepted fixes

**Subtasks**:
- [ ] Create `server/lib/hemnet-text-improver.ts`
- [ ] Implement generateImprovedVersion() function
- [ ] Add route: POST /api/integrations/hemnet/generate-improved
- [ ] Validate accepted fixes
- [ ] Apply fixes in correct order
- [ ] Calculate text changes for comparison
- [ ] Return improved version with stats
- [ ] Add unit tests

**Dependencies**: Task 1.1

**Acceptance Criteria**:
- Fixes applied correctly
- Text positions preserved
- Changes tracked for comparison
- No overlapping fixes

---

### Phase 2: Frontend Components

#### Task 2.1: Create Hemnet Analysis Page
**Status**: pending
**Priority**: high
**Estimated Effort**: 4 hours

**Description**: Create main page for Hemnet text analysis

**Subtasks**:
- [ ] Create `client/src/pages/HemnetAnalysis.tsx`
- [ ] Add route: /app/hemnet-analysis
- [ ] Implement page layout (2-column)
- [ ] Add state management (useState hooks)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add responsive design
- [ ] Add navigation link in header

**Dependencies**: None

**Acceptance Criteria**:
- Page accessible at /app/hemnet-analysis
- Layout matches design mockup
- Responsive on mobile/tablet/desktop
- Loading states displayed correctly

---

#### Task 2.2: Extend Hemnet Import Section
**Status**: pending
**Priority**: high
**Estimated Effort**: 3 hours

**Description**: Add mode selector to Hemnet import component

**Subtasks**:
- [ ] Update `client/src/components/IntegrationsPanel.tsx`
- [ ] Add mode selector (tabs or radio buttons)
- [ ] Add mode state management
- [ ] Update import logic for analyze mode
- [ ] Add quota display for analysis
- [ ] Add locked feature for free users
- [ ] Update UI styling
- [ ] Add tests

**Dependencies**: Task 1.2

**Acceptance Criteria**:
- Mode selector visible and functional
- Generate mode uses existing flow
- Analyze mode calls new endpoint
- Quota displayed correctly

---

#### Task 2.3: Create Original Text Display
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Display imported text with inline highlights

**Subtasks**:
- [ ] Create `client/src/components/HemnetTextDisplay.tsx`
- [ ] Integrate InlineHighlights component
- [ ] Add text editing support
- [ ] Add fix application logic
- [ ] Add undo/redo buttons
- [ ] Style component to match design
- [ ] Add tests

**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Text displayed with highlights
- Tooltips show on hover
- Fixes apply on click
- Undo/redo works correctly

---

#### Task 2.4: Create Improved Text Comparison
**Status**: pending
**Priority**: medium
**Estimated Effort**: 3 hours

**Description**: Side-by-side comparison of original vs improved

**Subtasks**:
- [ ] Create `client/src/components/HemnetComparison.tsx`
- [ ] Implement side-by-side layout
- [ ] Highlight additions (green)
- [ ] Highlight deletions (red)
- [ ] Add copy button
- [ ] Add PDF export button
- [ ] Add responsive design
- [ ] Add tests

**Dependencies**: Task 1.4, Task 2.3

**Acceptance Criteria**:
- Comparison displayed side-by-side
- Changes highlighted correctly
- Copy and export work
- Responsive on mobile

---

#### Task 2.5: Create React Query Hooks
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Create hooks for Hemnet analysis API calls

**Subtasks**:
- [ ] Create `client/src/hooks/use-hemnet-analysis.ts`
- [ ] Implement useHemnetAnalysis() hook
- [ ] Implement useGenerateImproved() hook
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add cache invalidation
- [ ] Add tests

**Dependencies**: Task 1.2, Task 1.4

**Acceptance Criteria**:
- Hooks handle API calls correctly
- Loading states managed
- Errors handled gracefully
- Cache invalidated on success

---

### Phase 3: Integration & Polish

#### Task 3.1: Integrate Expert Feedback Panel
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Integrate existing ExpertFeedbackPanel into analysis page

**Subtasks**:
- [ ] Import ExpertFeedbackPanel component
- [ ] Wire up feedback click handlers
- [ ] Wire up fix click handlers
- [ ] Wire up dismiss handlers
- [ ] Add AI suggest integration
- [ ] Test all interactions
- [ ] Update styling if needed

**Dependencies**: Task 2.1, Task 2.3

**Acceptance Criteria**:
- Feedback panel displays correctly
- All click handlers work
- Feedback syncs with text display
- Styling consistent with design

---

#### Task 3.2: Add Image Gallery
**Status**: pending
**Priority**: low
**Estimated Effort**: 2 hours

**Description**: Display imported Hemnet images

**Subtasks**:
- [ ] Reuse image display logic from ResultSection
- [ ] Add grid layout for thumbnails
- [ ] Add full-screen view on click
- [ ] Add image count badge
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Add lazy loading

**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Images displayed in grid
- Click to view full-screen
- Loading states shown
- Lazy loading works

---

#### Task 3.3: Add Tier Access Controls
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Enforce tier-based access to analysis feature

**Subtasks**:
- [ ] Add LockedFeature wrapper for free users
- [ ] Show quota in user status widget
- [ ] Add upgrade prompt on quota exceeded
- [ ] Update pricing page with analysis info
- [ ] Add feature badge in navigation
- [ ] Test all tier scenarios

**Dependencies**: Task 1.3, Task 2.1

**Acceptance Criteria**:
- Free users see locked feature
- Pro/Premium users can access
- Quota displayed correctly
- Upgrade prompts work

---

#### Task 3.4: Add Progress Indicators
**Status**: pending
**Priority**: medium
**Estimated Effort**: 2 hours

**Description**: Show progress during analysis

**Subtasks**:
- [ ] Add loading skeleton for analysis
- [ ] Add progress steps (5 steps)
- [ ] Add progress percentage
- [ ] Add step descriptions
- [ ] Add WebSocket support (optional)
- [ ] Test loading states

**Dependencies**: Task 2.1

**Acceptance Criteria**:
- Progress shown during analysis
- Steps update correctly
- Percentage accurate
- Loading skeleton matches design

---

### Phase 4: Testing & Documentation

#### Task 4.1: Add Unit Tests
**Status**: pending
**Priority**: high
**Estimated Effort**: 4 hours

**Description**: Comprehensive unit test coverage

**Subtasks**:
- [ ] Test expert analysis module
- [ ] Test text span detection
- [ ] Test auto-fix generation
- [ ] Test improved version generator
- [ ] Test React components
- [ ] Test React hooks
- [ ] Achieve 80%+ coverage

**Dependencies**: All implementation tasks

**Acceptance Criteria**:
- All modules have unit tests
- Test coverage > 80%
- All tests pass
- Edge cases covered

---

#### Task 4.2: Add Integration Tests
**Status**: pending
**Priority**: high
**Estimated Effort**: 3 hours

**Description**: Test API endpoints end-to-end

**Subtasks**:
- [ ] Test /api/integrations/hemnet/analyze
- [ ] Test /api/integrations/hemnet/generate-improved
- [ ] Test quota enforcement
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Test authentication

**Dependencies**: All backend tasks

**Acceptance Criteria**:
- All endpoints tested
- Error scenarios covered
- Quota enforcement verified
- Rate limiting works

---

#### Task 4.3: Add E2E Tests
**Status**: pending
**Priority**: medium
**Estimated Effort**: 3 hours

**Description**: Test complete user flows

**Subtasks**:
- [ ] Test analyze existing listing flow
- [ ] Test apply fixes flow
- [ ] Test generate improved flow
- [ ] Test quota exceeded flow
- [ ] Test error handling
- [ ] Test responsive design

**Dependencies**: All frontend tasks

**Acceptance Criteria**:
- All user flows tested
- Tests run in CI/CD
- Screenshots captured
- Tests pass consistently

---

#### Task 4.4: Update Documentation
**Status**: pending
**Priority**: medium
**Estimated Effort**: 2 hours

**Description**: Document new feature

**Subtasks**:
- [ ] Update README with feature description
- [ ] Add API documentation
- [ ] Add user guide
- [ ] Add developer guide
- [ ] Update changelog
- [ ] Add screenshots

**Dependencies**: All implementation tasks

**Acceptance Criteria**:
- Documentation complete
- Examples provided
- Screenshots included
- Changelog updated

---

### Phase 5: Deployment & Monitoring

#### Task 5.1: Database Migration
**Status**: pending
**Priority**: high
**Estimated Effort**: 1 hour

**Description**: Deploy database schema changes

**Subtasks**:
- [ ] Review migration script
- [ ] Test migration on staging
- [ ] Run migration on production
- [ ] Verify data integrity
- [ ] Update existing rows

**Dependencies**: Task 1.3

**Acceptance Criteria**:
- Migration runs successfully
- No data loss
- Existing users unaffected
- Rollback plan ready

---

#### Task 5.2: Deploy to Staging
**Status**: pending
**Priority**: high
**Estimated Effort**: 2 hours

**Description**: Deploy feature to staging environment

**Subtasks**:
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Run smoke tests
- [ ] Test with real Hemnet URLs
- [ ] Verify quota tracking
- [ ] Check performance

**Dependencies**: All implementation tasks

**Acceptance Criteria**:
- Feature works on staging
- No errors in logs
- Performance acceptable
- Ready for production

---

#### Task 5.3: Beta Release (Premium Only)
**Status**: pending
**Priority**: high
**Estimated Effort**: 1 hour

**Description**: Enable feature for Premium users only

**Subtasks**:
- [ ] Add feature flag
- [ ] Enable for Premium tier
- [ ] Announce to Premium users
- [ ] Monitor usage
- [ ] Collect feedback
- [ ] Fix critical bugs

**Dependencies**: Task 5.2

**Acceptance Criteria**:
- Feature available to Premium users
- Free/Pro users see locked feature
- No critical bugs
- Positive user feedback

---

#### Task 5.4: General Availability
**Status**: pending
**Priority**: high
**Estimated Effort**: 1 hour

**Description**: Enable feature for all tiers

**Subtasks**:
- [ ] Remove feature flag
- [ ] Enable for all tiers
- [ ] Announce feature launch
- [ ] Monitor usage patterns
- [ ] Adjust quotas if needed
- [ ] Update marketing materials

**Dependencies**: Task 5.3

**Acceptance Criteria**:
- Feature available to all users
- Quotas enforced correctly
- No performance issues
- Positive user feedback

---

#### Task 5.5: Add Monitoring & Alerts
**Status**: pending
**Priority**: medium
**Estimated Effort**: 2 hours

**Description**: Monitor feature usage and performance

**Subtasks**:
- [ ] Add logging for key events
- [ ] Add Sentry error tracking
- [ ] Add performance metrics
- [ ] Add usage analytics
- [ ] Set up alerts for errors
- [ ] Create monitoring dashboard

**Dependencies**: Task 5.4

**Acceptance Criteria**:
- All events logged
- Errors tracked in Sentry
- Performance metrics collected
- Alerts configured
- Dashboard created

---

## Task Summary

**Total Tasks**: 24
**Total Estimated Effort**: 56 hours (7 days)

**By Phase**:
- Phase 1 (Backend): 11 hours
- Phase 2 (Frontend): 14 hours
- Phase 3 (Integration): 8 hours
- Phase 4 (Testing): 12 hours
- Phase 5 (Deployment): 7 hours

**By Priority**:
- High: 18 tasks (42 hours)
- Medium: 5 tasks (12 hours)
- Low: 1 task (2 hours)

## Dependencies Graph

```
Phase 1: Backend Foundation
├── Task 1.1: Extract Expert Analysis Module
│   ├── Task 1.2: Create Hemnet Analysis Endpoint
│   └── Task 1.4: Create Improved Version Generator
└── Task 1.3: Add Analysis Quota Tracking

Phase 2: Frontend Components
├── Task 2.1: Create Hemnet Analysis Page
│   ├── Task 2.3: Create Original Text Display
│   ├── Task 2.4: Create Improved Text Comparison
│   └── Task 3.2: Add Image Gallery
├── Task 2.2: Extend Hemnet Import Section
└── Task 2.5: Create React Query Hooks

Phase 3: Integration & Polish
├── Task 3.1: Integrate Expert Feedback Panel
├── Task 3.3: Add Tier Access Controls
└── Task 3.4: Add Progress Indicators

Phase 4: Testing & Documentation
├── Task 4.1: Add Unit Tests
├── Task 4.2: Add Integration Tests
├── Task 4.3: Add E2E Tests
└── Task 4.4: Update Documentation

Phase 5: Deployment & Monitoring
├── Task 5.1: Database Migration
├── Task 5.2: Deploy to Staging
├── Task 5.3: Beta Release
├── Task 5.4: General Availability
└── Task 5.5: Add Monitoring & Alerts
```

## Critical Path

1. Task 1.1: Extract Expert Analysis Module (4h)
2. Task 1.2: Create Hemnet Analysis Endpoint (3h)
3. Task 2.1: Create Hemnet Analysis Page (4h)
4. Task 2.3: Create Original Text Display (2h)
5. Task 3.1: Integrate Expert Feedback Panel (2h)
6. Task 4.2: Add Integration Tests (3h)
7. Task 5.2: Deploy to Staging (2h)
8. Task 5.4: General Availability (1h)

**Critical Path Duration**: 21 hours (3 days)

## Risk Assessment

**High Risk**:
- Task 1.1: Expert analysis extraction may break existing functionality
- Task 1.3: Database migration could fail on production
- Task 5.3: Beta users may find critical bugs

**Medium Risk**:
- Task 2.4: Side-by-side comparison may be complex to implement
- Task 3.4: WebSocket progress updates may be unreliable
- Task 4.3: E2E tests may be flaky

**Low Risk**:
- Task 3.2: Image gallery is straightforward
- Task 4.4: Documentation is low-risk
- Task 5.5: Monitoring is non-critical

## Mitigation Strategies

**For High Risk Tasks**:
- Task 1.1: Extensive unit tests before refactoring
- Task 1.3: Test migration on staging first, have rollback plan
- Task 5.3: Limit beta to small group, monitor closely

**For Medium Risk Tasks**:
- Task 2.4: Start with simple comparison, iterate
- Task 3.4: Make WebSocket optional, fall back to polling
- Task 4.3: Use retry logic, run tests multiple times

