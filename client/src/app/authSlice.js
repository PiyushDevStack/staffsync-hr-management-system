import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, payload, setCsrfToken } from '../services/api';
export const fetchCurrentUser = createAsyncThunk('auth/currentUser', async (_, { rejectWithValue }) => {
  try {
    const csrfResponse = payload(await api.get('/auth/csrf'));
    setCsrfToken(csrfResponse.csrfToken);
    return payload(await api.get('/auth/me')).user;
  } catch { return rejectWithValue(null); }
});
export const signIn = createAsyncThunk('auth/signIn', async (credentials, { rejectWithValue }) => {
  try {
    const csrfResponse = payload(await api.get('/auth/csrf'));
    setCsrfToken(csrfResponse.csrfToken);
    const session = payload(await api.post('/auth/login', credentials));
    setCsrfToken(session.csrfToken);
    return session.user;
  } catch (error) { return rejectWithValue(error.response?.data?.message || 'Sign in failed.'); }
});
export const signOut = createAsyncThunk('auth/signOut', async () => {
  try { await api.post('/auth/logout'); } catch { /* Local sign-out must work even if the session expired. */ } finally { setCsrfToken(''); }
  return true;
});
const authSlice = createSlice({
  name: 'auth', initialState: { user: null, ready: false, loading: false, error: null },
  reducers: { clearAuthError(state) { state.error = null; } },
  extraReducers(builder) {
    builder
      .addCase(fetchCurrentUser.pending, (state) => { state.loading = true; })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => { state.user = action.payload; state.ready = true; state.loading = false; })
      .addCase(fetchCurrentUser.rejected, (state) => { state.user = null; state.ready = true; state.loading = false; })
      .addCase(signIn.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signIn.fulfilled, (state, action) => { state.user = action.payload; state.ready = true; state.loading = false; state.error = null; })
      .addCase(signIn.rejected, (state, action) => { state.loading = false; state.error = action.payload || 'Sign in failed.'; })
      .addCase(signOut.fulfilled, (state) => { state.user = null; state.ready = true; state.loading = false; state.error = null; });
  }
});
export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
