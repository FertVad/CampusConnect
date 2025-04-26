import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";

export function StartDatePicker({ value, onChange }: { value: Date; onChange: (d: Date)=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-start">
          {format(value, "d MMMM yyyy", { locale: ru })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          initialFocus
          mode="single"
          selected={value}
          onSelect={(d)=> d && (onChange(d), setOpen(false))}
          weekStartsOn={1}
          locale={ru}
          // Устанавливаем календарь на выбранную дату вместо текущей
          defaultMonth={value}
          fromDate={new Date(2000, 0, 1)} // Минимальная дата - 1 января 2000 года
          toDate={new Date(2100, 11, 31)} // Максимальная дата - 31 декабря 2100 года
        />
      </PopoverContent>
    </Popover>
  );
}