import { Stack, SectionHeading } from "@/components/typography";
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from "@/components/ui/carousel";

/** Carousel showcase — swipeable slides (Embla) with prev/next. */
export function CarouselDemo() {
  return (
    <Stack space="section" className="max-w-xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground"><code className="text-foreground">Carousel</code> — swipeable slides (Embla) with prev/next controls.</p>
      <Stack space="title">
        <SectionHeading as="h3" title="Default" />
        <Carousel className="mx-auto w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <CarouselItem key={i}>
                <div className="flex aspect-square items-center justify-center rounded-lg border border-fp-outline-1 bg-fp-card-1 text-3xl font-semibold text-foreground">{i + 1}</div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </Stack>
    </Stack>
  );
}
