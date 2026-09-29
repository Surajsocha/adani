import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'
import api from '../../api/axios'

// ── Async Thunks ──────────────────────────────────

export const loginStep1 = createAsyncThunk(
  'auth/loginStep1',
  async ({ employee_id, password }, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/auth/login/', { employee_id, password })
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Login failed')
    }
  }
)

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ employee_id, otp }, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/auth/verify-otp/', { employee_id, otp })
      const { access, refresh, user } = res.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      return { access, refresh, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Invalid OTP')
    }
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/users/me/')
      return res.data
    } catch {
      return rejectWithValue('Session expired')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await api.post('/auth/logout/', { refresh })
    } catch {}
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
)

// ── Slice ─────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    pendingOTP: false,
    pendingEmployeeId: null,
    otpMessage: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
    setDirectAuth: (state, action) => {
      const { access, refresh, user } = action.payload
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      state.user = user
      state.isAuthenticated = true
      state.pendingOTP = false
    }
  },
  extraReducers: (builder) => {
    // Login Step 1
    builder
      .addCase(loginStep1.pending, (state) => { state.loading = true; state.error = null })
      .addCase(loginStep1.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.requires_otp) {
          state.pendingOTP = true
          state.pendingEmployeeId = action.payload.employee_id
          state.otpMessage = action.payload.message
        } else {
          const { access, refresh, user } = action.payload
          localStorage.setItem('access_token', access)
          localStorage.setItem('refresh_token', refresh)
          state.user = user
          state.isAuthenticated = true
        }
      })
      .addCase(loginStep1.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Verify OTP
    builder
      .addCase(verifyOTP.pending, (state) => { state.loading = true; state.error = null })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.pendingOTP = false
        state.pendingEmployeeId = null
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Fetch User
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
      })

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null
      state.isAuthenticated = false
      state.pendingOTP = false
    })
  },
})

export const { clearError, setDirectAuth } = authSlice.actions
export default authSlice.reducer
