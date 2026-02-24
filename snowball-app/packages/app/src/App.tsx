import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Landing } from '@/pages/Landing'
import { Dashboard } from '@/pages/Dashboard'
import { Borrow } from '@/pages/Borrow'
import { Earn } from '@/pages/Earn'
import { Stats } from '@/pages/Stats'
import { Agent } from '@/pages/Agent'
import { Chat } from '@/pages/Chat'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/borrow" element={<Borrow />} />
                    <Route path="/earn" element={<Earn />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/agent" element={<Agent />} />
                    <Route path="/chat" element={<Chat />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
