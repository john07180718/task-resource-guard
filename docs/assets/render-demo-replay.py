#!/usr/bin/env python3
"""Render verified CI diagnostics as a labeled replay, not a screen recording.

Requires Pillow and the DejaVu Sans fonts (or pass --font-dir).
Run from any directory: python docs/assets/render-demo-replay.py
"""

import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DIAGNOSTICS = [
    '[1/5] Two private loopback HTTP services started; one has an active demo request.',
    '[2/5] Dry-run: idle would close; busy is protected; both HTTP services still respond.',
    '[3/5] Apply: idle exited normally; the busy HTTP request and service were preserved.',
    '[4/5] The held request completed; a second apply closed its now-idle service normally.',
    '[5/5] Both child exits verified; the temporary demo workspace was removed.',
]
COMMIT = '77fef6c4720ed77ccc4a212ce536bbf2bb957ef0'
RUN = '40108746202'
DURATIONS = [4000, 4000, 4000, 4000, 8000]
WIDTH, HEIGHT = 1280, 640
BG, PANEL, EDGE = '#0b1425', '#102139', '#2b435c'
MINT, WHITE, MUTED = '#71f3d0', '#f1f7ff', '#b5c8dc'


def wrapped(draw, text, font, width):
    lines, line = [], ''
    for word in text.split(' '):
        candidate = (line + ' ' + word).strip()
        if line and draw.textlength(candidate, font=font) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    return lines + [line]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font-dir', type=Path,
                        default=Path('/usr/share/fonts/truetype/dejavu'))
    parser.add_argument('--output', type=Path,
                        default=Path(__file__).with_name('demo-replay.gif'))
    args = parser.parse_args()
    font = lambda name, size: ImageFont.truetype(str(args.font_dir / name), size)
    title = font('DejaVuSans-Bold.ttf', 35)
    label = font('DejaVuSans.ttf', 19)
    small = font('DejaVuSans.ttf', 16)
    mono = font('DejaVuSansMono.ttf', 21)
    bold = font('DejaVuSans-Bold.ttf', 16)
    frames = []
    for stage in range(1, 6):
        frame = Image.new('RGB', (WIDTH, HEIGHT), BG)
        draw = ImageDraw.Draw(frame)
        for offset in range(3):
            draw.line((1040 + offset * 40, 0, 1280, 240 - offset * 40),
                      fill='#193149', width=1)
        draw.rounded_rectangle((48, 43, 92, 87), radius=12, fill=MINT)
        draw.line((59, 66, 68, 74, 82, 56), fill=BG, width=4)
        draw.text((111, 42), 'Task Resource Guard', font=title, fill=WHITE)
        draw.text((50, 104), 'Verified CI output replay | timing adjusted',
                  font=label, fill=MINT)
        draw.text((1040, 56), f'STAGE {stage} OF 5', font=bold, fill=MINT)
        draw.text((50, 137), 'Exact diagnostics, revealed in order. Not a screen recording.',
                  font=small, fill=MUTED)
        for index, diagnostic in enumerate(DIAGNOSTICS):
            top = 180 + index * 73
            revealed, current = index < stage, index == stage - 1
            fill = '#15352f' if current else PANEL
            border = '#3b8c77' if current else EDGE
            draw.rounded_rectangle((48, top, 1232, top + 64), radius=10,
                                   fill=fill if revealed else '#0e1b2d', outline=border)
            if revealed:
                draw.rounded_rectangle((49, top + 11, 53, top + 53), radius=2, fill=MINT)
                lines = wrapped(draw, diagnostic, mono, 1132)
                if len(lines) > 2:
                    raise ValueError('Diagnostic does not fit the two-line layout')
                text_y = top + (18 if len(lines) == 1 else 6)
                for row, line in enumerate(lines):
                    draw.text((71, text_y + row * 27), line, font=mono,
                              fill=WHITE if current else '#c4d7e8')
            else:
                draw.text((71, top + 20), f'[{index + 1}/5]', font=mono, fill='#49627b')
        draw.line((48, 565, 1232, 565), fill=EDGE, width=1)
        draw.text((50, 583), f'Windows CI  {RUN}  |  commit {COMMIT[:12]}',
                  font=small, fill=MUTED)
        draw.text((50, 608), 'Windows Server 2022  /  Node 24.22.1  /  PowerShell 7.6.8',
                  font=small, fill='#829eb8')
        for index in range(5):
            x = 1080 + index * 31
            draw.rounded_rectangle((x, 592, x + 23, 598), radius=3,
                                   fill=MINT if index < stage else '#29435b')
        frames.append(frame)
    # All frames share one palette, avoiding palette flicker on each reveal.
    palette = frames[-1].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    converted = [frame.quantize(palette=palette, dither=Image.Dither.NONE)
                 for frame in frames]
    converted[0].save(args.output, save_all=True, append_images=converted[1:],
                      duration=DURATIONS, loop=0, optimize=True, disposal=2,
                      comment=b'Verified CI diagnostics replay; timing adjusted; not a screen recording.')
    print(f'{args.output.name}: {WIDTH}x{HEIGHT}, {sum(DURATIONS)/1000:.0f}s, '
          f'{len(converted)} frames, {args.output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
