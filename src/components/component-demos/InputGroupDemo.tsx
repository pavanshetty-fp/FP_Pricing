import * as React from "react";
import {
  Search,
  Mail,
  Info,
  CheckCircle2,
  Loader2,
  Send,
  ChevronDown,
} from "lucide-react";
import { Stack, SectionHeading } from "@/components/typography";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

/** A labelled example row. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Input Group showcase — Figma "InputGroup" (18672:226415). Demonstrates the
 * eight inline addon variants, the four states, and the block-addon footer.
 */
export function InputGroupDemo() {
  const [proto, setProto] = React.useState("https://");

  return (
    <TooltipProvider>
      <Stack space="section" className="max-w-xl overflow-auto pb-10">
        <p className="text-sm text-muted-foreground">
          <code className="text-foreground">InputGroup</code> fuses a control with
          inline or block addons into one bordered group sharing a single focus
          ring and invalid / disabled state.
        </p>

        {/* The eight addon content variants */}
        <Stack space="title">
          <SectionHeading as="h3" title="Addon variants" />
          <div className="grid grid-cols-1 gap-4">
            <Row label="Icon">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Search…" />
              </InputGroup>
            </Row>

            <Row label="Text">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="fleetpanda.com" />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>.com</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Kbd">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Search…" />
                <InputGroupAddon align="inline-end">
                  <Kbd>⌘F</Kbd>
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Spinner">
              <InputGroup>
                <InputGroupInput placeholder="Checking availability…" />
                <InputGroupAddon align="inline-end">
                  <Loader2 className="animate-spin" />
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Check Circle">
              <InputGroup>
                <InputGroupInput defaultValue="username_available" />
                <InputGroupAddon align="inline-end">
                  <CheckCircle2 className="text-status-success" />
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Button">
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput placeholder="you@fleetpanda.com" />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant="default">
                    <Send />
                    Send
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Tooltip">
              <InputGroup>
                <InputGroupInput placeholder="API key" />
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        size="icon-xs"
                        aria-label="What is this?"
                      >
                        <Info />
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      Find this in Settings → Developer.
                    </TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
            </Row>

            <Row label="Dropdown">
              <InputGroup>
                <InputGroupAddon>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton>
                        {proto}
                        <ChevronDown />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {["https://", "http://", "ftp://"].map((p) => (
                        <DropdownMenuItem key={p} onSelect={() => setProto(p)}>
                          {p}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </InputGroupAddon>
                <InputGroupInput placeholder="fleetpanda.com" />
              </InputGroup>
            </Row>
          </div>
        </Stack>

        {/* States */}
        <Stack space="title">
          <SectionHeading as="h3" title="States" />
          <div className="grid grid-cols-1 gap-4">
            <Row label="Default">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Placeholder" />
              </InputGroup>
            </Row>
            <Row label="Filled">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput defaultValue="Acme Logistics" />
              </InputGroup>
            </Row>
            <Row label="Disabled">
              <InputGroup data-disabled="true">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Placeholder" disabled />
              </InputGroup>
            </Row>
            <Row label="Invalid">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  defaultValue="not-an-email"
                  aria-invalid
                />
              </InputGroup>
            </Row>
          </div>
        </Stack>

        {/* Block addons — textarea footer */}
        <Stack space="title">
          <SectionHeading as="h3" title="Block addon (textarea footer)" />
          <Label htmlFor="ig-post" className="sr-only">
            Post
          </Label>
          <InputGroup>
            <InputGroupTextarea
              id="ig-post"
              placeholder="What's happening?"
              className="min-h-24"
            />
            <InputGroupAddon align="block-end" className="border-t">
              <InputGroupText>0/280 characters</InputGroupText>
              <InputGroupText className="ml-auto">52% used</InputGroupText>
              <InputGroupButton variant="default">Post</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Stack>
      </Stack>
    </TooltipProvider>
  );
}
