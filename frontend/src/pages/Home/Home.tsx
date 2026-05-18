import React from 'react'
import { Header } from '@/components/Home/Header/Header'
import { About } from '@/components/Home/About/About'
import { Apps } from '@/components/Home/Apps/Apps'
import { Developer } from '@/components/Home/Developer/Developer'
import { Footer } from '@/components/Home/Footer/Footer'
import './Home.scss'

export const Home: React.FC = () => {
    return (
        <div className="home">
            <Header />
            <main className="home__main">
                <About />
                <Apps />
                <Developer />
            </main>
            <Footer />
        </div>
    )
}