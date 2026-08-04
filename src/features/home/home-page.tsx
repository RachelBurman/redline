import { BrandMark } from '#/components/brand/brand-mark'
import { HeroSection } from '#/components/home/hero-section'
import { PrinciplesSection } from '#/components/home/principles-section'
import { SiteHeader } from '#/components/navigation/site-header'

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <PrinciplesSection />
      </main>
      <footer className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-5 py-9 text-xs text-[#747d79] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <BrandMark />
        <p>Structured document review with version safety and human-controlled decisions.</p>
      </footer>
    </>
  )
}
