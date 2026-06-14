import {
  FileText,
  Image as ImageIcon,
  ChevronRight,
  MoreVertical,
  Plus,
} from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";

/** A labelled example row. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const VARIANTS = ["default", "outline", "muted"] as const;
const SIZES = ["default", "sm", "xs"] as const;

/**
 * Item showcase — Figma "Item" (18672:198607) + Media / Actions / Group. The
 * variant × size matrix, the media variants, the action types, and a grouped
 * list with separators.
 */
export function ItemDemo() {
  return (
    <Stack space="section" className="max-w-2xl overflow-auto pb-10">
      <p className="text-sm text-muted-foreground">
        <code className="text-foreground">Item</code> is a flexible list row —
        media + content (title + description) + actions — with variants, sizes,
        and a grouped list container.
      </p>

      {/* Variant × size */}
      <Stack space="title">
        <SectionHeading as="h3" title="Variant × size" />
        <div className="flex flex-col gap-3">
          {VARIANTS.map((variant) =>
            SIZES.map((size) => (
              <Item key={`${variant}-${size}`} variant={variant} size={size}>
                <ItemMedia variant="icon">
                  <FileText />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {variant} · {size}
                  </ItemTitle>
                  <ItemDescription>Item description goes here</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm">
                    Action
                  </Button>
                </ItemActions>
              </Item>
            ))
          )}
        </div>
      </Stack>

      {/* Media variants */}
      <Stack space="title">
        <SectionHeading as="h3" title="Media variants" />
        <div className="flex flex-col gap-3">
          <Row label="Icon (Simple)">
            <Item variant="outline">
              <ItemMedia>
                <FileText className="size-5 text-muted-foreground" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Plain icon</ItemTitle>
                <ItemDescription>No surrounding box.</ItemDescription>
              </ItemContent>
            </Item>
          </Row>
          <Row label="Icon (boxed)">
            <Item variant="outline">
              <ItemMedia variant="icon">
                <ImageIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Boxed icon</ItemTitle>
                <ItemDescription>Muted rounded tile.</ItemDescription>
              </ItemContent>
            </Item>
          </Row>
          <Row label="Image">
            <Item variant="outline">
              <ItemMedia variant="image">
                <img src="https://github.com/vercel.png" alt="" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Image thumbnail</ItemTitle>
                <ItemDescription>10×10 cover-cropped image.</ItemDescription>
              </ItemContent>
            </Item>
          </Row>
          <Row label="Avatar">
            <Item variant="outline">
              <ItemMedia>
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>@shadcn</ItemTitle>
                <ItemDescription>Single avatar media.</ItemDescription>
              </ItemContent>
            </Item>
          </Row>
          <Row label="AvatarGroup">
            <Item variant="outline">
              <ItemMedia>
                <AvatarGroup>
                  <Avatar>
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>B</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <AvatarGroupCount>+4</AvatarGroupCount>
                </AvatarGroup>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Project team</ItemTitle>
                <ItemDescription>Overlapping avatar stack.</ItemDescription>
              </ItemContent>
            </Item>
          </Row>
        </div>
      </Stack>

      {/* Action types */}
      <Stack space="title">
        <SectionHeading as="h3" title="Action types" />
        <div className="flex flex-col gap-3">
          <Row label="Buttons">
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Invite teammate</ItemTitle>
                <ItemDescription>Send an invitation by email.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button size="sm">Invite</Button>
              </ItemActions>
            </Item>
          </Row>
          <Row label="Text + Button">
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Recording</ItemTitle>
                <ItemDescription>Standup — June 13.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <span className="text-sm tabular-nums text-muted-foreground">
                  3:45
                </span>
                <Button variant="outline" size="icon-sm" aria-label="Play">
                  <ChevronRight />
                </Button>
              </ItemActions>
            </Item>
          </Row>
          <Row label="Icon">
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Settings row</ItemTitle>
                <ItemDescription>A single icon action.</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="icon-sm" aria-label="More">
                  <MoreVertical />
                </Button>
              </ItemActions>
            </Item>
          </Row>
        </div>
      </Stack>

      {/* ItemGroup */}
      <Stack space="title">
        <SectionHeading as="h3" title="Item group" />
        <div className="rounded-lg border border-border">
          <ItemGroup>
            {["Ada Lovelace", "Alan Turing", "Grace Hopper", "Edsger Dijkstra"].map(
              (name, i) => (
                <div key={name}>
                  {i > 0 && <ItemSeparator />}
                  <Item size="sm">
                    <ItemMedia>
                      <Avatar>
                        <AvatarFallback>
                          {name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{name}</ItemTitle>
                      <ItemDescription>Item description goes here</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="ghost" size="icon-sm" aria-label={`Add ${name}`}>
                        <Plus />
                      </Button>
                    </ItemActions>
                  </Item>
                </div>
              )
            )}
          </ItemGroup>
        </div>
      </Stack>
    </Stack>
  );
}
