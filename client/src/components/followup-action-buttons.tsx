import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, CalendarPlus, Video } from "lucide-react";

interface FollowUpActionButtonsProps {
  id: string;
  prefix: string;
  videoLink?: string | null;
  onNotes: () => void;
  onSchedule: () => void;
  notesLabel?: string;
  scheduleLabel?: string;
  meetingLabel?: string;
}

export function FollowUpActionButtons({
  id,
  prefix,
  videoLink,
  onNotes,
  onSchedule,
  notesLabel,
  scheduleLabel,
  meetingLabel,
}: FollowUpActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={onNotes}
            data-testid={`button-${prefix}-notes-${id}`}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{notesLabel || t('followUps.followUpNote')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={onSchedule}
            data-testid={`button-${prefix}-schedule-${id}`}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{scheduleLabel || t('followUps.scheduleNext')}</TooltipContent>
      </Tooltip>
      {videoLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={videoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="default" size="icon" data-testid={`button-${prefix}-meeting-${id}`}>
                <Video className="h-4 w-4" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>{meetingLabel || t('followUps.joinMeeting')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
