"use client"

import { SiteNavbar } from "@/components/home/site-navbar"
import { HeroSection } from "@/components/home/hero-section"
import { LiveStatsStrip } from "@/components/home/live-stats-strip"
import { HowItWorks } from "@/components/home/how-it-works"
import { BangladeshMapPreview } from "@/components/home/bangladesh-map-preview"
import { FeaturedHospitals } from "@/components/home/featured-hospitals"
import { SiteFooter } from "@/components/home/site-footer"
import { Backlight } from "@/components/ui/backlight"
import { Logo, LogoIcon } from "@/components/logo"
import { StatCardChoropleth } from "@/components/stat-card-choropleth"
import CarouselCards from "@/components/kokonutui/carousel-cards"
import { QuickSearch } from "@/components/home/quick-search"

export default function HomePage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <HeroSection />

        {/* <div>
         <Backlight blur={40} className="absolute left-1/2 top-0 -z-10 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-30">
            <LogoIcon />
         </Backlight>
        </div> */}

        {/* <div className="absolute top-160 left-150 z-10 mx-auto w-full max-w-3xl -translate-y-1/2 px-4 sm:px-6 lg:px-8"> */}
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 mb-8">
          <QuickSearch />
        </div>
        {/* </div> */}

        <div>
          <StatCardChoropleth />
        </div>
        {/* <LiveStatsStrip /> */}
        {/* <HowItWorks /> */}
        {/* <BangladeshMapPreview /> */}
        {/* <CarouselCards /> */}
        <FeaturedHospitals />
      </main>
      <SiteFooter />
    </>
  )
}
