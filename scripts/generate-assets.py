"""Create original SVG placeholders; optionally synthesize MP3s with a dev-only lameenc.

Usage: python scripts/generate-assets.py [--audio | --audio-only]
The website does not use Python or any encoder at runtime.
"""
from pathlib import Path
import math
import random
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
INK = '#675649'


def person(x, y, scale=1, adult=False, outfit='#dba879', pose='normal', hair='#705446'):
    """A friendly rounded character, positioned by the center of their head."""
    length = 87 if adult else 65
    arms = {
        'normal': '<path d="M-25 52 Q-42 64 -36 81 M25 52 Q41 64 35 81"/>',
        'wave': '<path d="M-25 53 Q-44 34 -39 14 M25 53 L36 79"/>',
        'offer': '<path d="M-25 53 Q-47 54 -54 37 M25 53 Q45 54 53 38"/>',
        'hold': '<path d="M-25 53 Q-37 70 -8 74 M25 53 Q39 69 8 74"/>',
    }[pose]
    return f'''<g transform="translate({x} {y}) scale({scale})">
      <ellipse cy="{length + 31}" rx="36" ry="6" fill="#99856a" opacity=".10"/>
      <path d="M-15 {length-3} L-17 {length+25} M15 {length-3} L18 {length+25}" stroke="#be9176" stroke-width="12" stroke-linecap="round"/>
      <path d="M-23 {length+27} h15 M12 {length+27} h15" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>
      <path d="M-20 37 Q0 30 20 37 L30 {length} Q0 {length+12} -30 {length} Z" fill="{outfit}"/>
      <g fill="none" stroke="#edba93" stroke-width="12" stroke-linecap="round">{arms}</g>
      <path d="M-26 -2 Q-27 -38 0 -36 Q33 -35 29 5 L30 32 Q11 38 -27 28Z" fill="{hair}"/>
      <ellipse cy="1" rx="25" ry="29" fill="#f2c7a6"/>
      <path d="M-25 -6 Q-26 -36 2 -35 Q30 -34 27 -5 Q10 -11 4 -24 Q-5 -10 -25 -6" fill="{hair}"/>
      <ellipse cx="-9" cy="2" rx="2" ry="2.6" fill="{INK}"/><ellipse cx="10" cy="2" rx="2" ry="2.6" fill="{INK}"/>
      <ellipse cx="-16" cy="12" rx="6" ry="3.5" fill="#e9a18f" opacity=".55"/><ellipse cx="17" cy="12" rx="6" ry="3.5" fill="#e9a18f" opacity=".55"/>
      <path d="M-5 14 Q1 20 7 13" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>
      {'<path d="M22 -4 Q39 1 31 31" stroke="'+hair+'" stroke-width="13" fill="none"/>' if adult else ''}
    </g>'''


def heart(x, y, s=1, color='#d6909b'):
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 8 C-21 -6 -13 -21 -2 -14 Q0 -12 2 -14 C14 -24 27 -6 0 8Z" fill="{color}"/>'


def flower(x, y, s=1):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0V39 M0 24 Q-18 6 -16 24 Q-8 32 0 29" stroke="#7e9c72" stroke-width="4" fill="#a1b58a"/>' + ''.join(f'<ellipse transform="rotate({a})" cy="-10" rx="7" ry="11" fill="#e4a5ac"/>' for a in range(0, 360, 72)) + '<circle r="7" fill="#e8c46a"/></g>'


def board():
    return '<path d="M55 65 L47 207 M244 65 L255 207" stroke="#c2a580" stroke-width="8" stroke-linecap="round"/><rect x="42" y="35" width="216" height="135" rx="14" fill="#c6ad88"/><rect x="50" y="43" width="200" height="118" rx="9" fill="#8da994"/><path d="M73 74 H127 M73 88 H112" stroke="#f6f5df" stroke-width="4" stroke-linecap="round"/><path d="M162 94 l12 -20 12 20Z" fill="#ead490"/><circle cx="207" cy="84" r="12" fill="#e9c2bd"/><path d="M77 123 Q104 108 130 127" fill="none" stroke="#e4ebd6" stroke-width="3" stroke-linecap="round"/>'


def wrap(content, color):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 260" role="img">
    <rect x="8" y="9" width="304" height="242" rx="60" fill="{color}"/>
    <circle cx="262" cy="47" r="22" fill="#fff" opacity=".32"/>
    <ellipse cx="160" cy="224" rx="125" ry="13" fill="#a38d70" opacity=".08"/>
    {content}</svg>'''


def generate_images():
    scenes = {}
    scenes['central/teacher'] = (board() + person(175, 105, .86, True, '#deb19c', 'wave') + '<path d="M145 148L114 102" stroke="#a58965" stroke-width="4" stroke-linecap="round"/>' + flower(60, 194, .55), '#edf1e2')
    scenes['central/doctor'] = ('<rect x="214" y="43" width="56" height="56" rx="17" fill="#e7f0ec"/><path d="M242 55V87 M226 71H258" stroke="#9bbbaa" stroke-width="9"/>' + person(152, 99, .97, True, '#f9f6ee') + '<path d="M137 135Q127 164 146 166 Q168 165 157 135 M147 165V180" stroke="#86a3a0" stroke-width="4" fill="none"/><circle cx="148" cy="181" r="6" fill="#abc6c0"/>', '#e9f1f0')
    scenes['central/chef'] = (person(158, 101, .98, True, '#dfba81', 'hold') + '<path d="M136 79V51 Q121 47 127 34 Q133 23 145 29 Q153 10 169 22 Q186 16 191 31 Q209 39 193 53 L184 80Z" fill="#fffaf1" stroke="#e5dbca" stroke-width="2"/><path d="M144 141 L173 141 182 184 Q158 196 135 184Z" fill="#fff5de"/><ellipse cx="158" cy="171" rx="35" ry="9" fill="#a3b7a0"/>', '#f5ecdb')
    scenes['emotion/love'] = (person(185, 96, .95, True, '#94b6a2', 'hold') + person(120, 145, .73, False, '#dfac8e', 'offer') + heart(85, 62, 1.3) + heart(252, 93, .8) + heart(237, 46, .6), '#f6e5e6')
    scenes['emotion/gratitude'] = (person(212, 91, .96, True, '#a3b99a', 'offer') + person(106, 140, .78, False, '#e3b889', 'offer') + flower(157, 132, .8) + flower(140, 122, .75) + flower(169, 115, .7) + heart(77, 78, .7), '#f6e5e6')
    scenes['emotion/toys'] = (person(159, 97, .93, False, '#a8bac9', 'hold') + '<rect x="47" y="179" width="43" height="43" rx="8" fill="#d8aa8c"/><rect x="91" y="187" width="37" height="36" rx="7" fill="#a6bca1"/><path d="M46 174 L68 145 91 174Z" fill="#e3c57f"/><circle cx="238" cy="183" r="31" fill="#c7a382"/><circle cx="216" cy="161" r="12" fill="#c7a382"/><circle cx="260" cy="161" r="12" fill="#c7a382"/><circle cx="229" cy="179" r="2" fill="#675649"/><circle cx="247" cy="179" r="2" fill="#675649"/><ellipse cx="238" cy="192" rx="11" ry="9" fill="#efd8b8"/><circle cx="238" cy="189" r="3" fill="#675649"/>', '#f7ebdf')
    scenes['action/greeting'] = (person(218, 92, .97, True, '#b4b79a', 'wave') + person(100, 138, .83, False, '#dba98f', 'wave') + '<path d="M48 112 Q42 98 48 87 M63 103 Q58 94 63 85" stroke="#bca35e" stroke-width="3" fill="none" stroke-linecap="round"/>' + heart(155, 71, .8), '#e7eff5')
    scenes['action/help'] = (person(230, 95, .93, True, '#c8b395', 'hold') + person(88, 140, .8, False, '#a4b9cc', 'offer') + '<path d="M117 176H204L197 224H126Z" fill="#b6c4a7"/><path d="M114 177H207" stroke="#8fa381" stroke-width="8" stroke-linecap="round"/><rect x="147" y="155" width="25" height="22" rx="4" fill="#e3c582"/><circle cx="184" cy="161" r="15" fill="#dba3a5"/><rect x="104" y="146" width="24" height="25" rx="5" fill="#deb28a" transform="rotate(-15 116 158)"/>', '#e5eef4')
    scenes['action/football'] = ('<path d="M29 216Q160 169 290 215" fill="#c1d0ac"/><path d="M240 115V193 M240 117H284V190 M254 118V190 M269 118V190 M242 137H284 M242 155H284 M242 174H284" stroke="#fff9" stroke-width="3" fill="none"/>' + person(134, 101, .95, False, '#d8ab7e', 'wave') + '<circle cx="203" cy="205" r="25" fill="#faf5e9" stroke="#c9c7b7" stroke-width="2"/><path d="M199 191L212 197 209 211 194 213 187 201Z" fill="#7f9985"/><path d="M184 184L189 195 M225 199L212 198 M202 229L202 212" stroke="#9eada0" stroke-width="3"/>', '#eaf0e1')
    scenes['attitude/listening'] = ('<g transform="translate(88 4) scale(.74)">' + board() + '</g>' + person(229, 111, .75, True, '#d9b89c', 'wave') + person(96, 145, .8, False, '#9fb6c6', 'hold') + '<rect x="46" y="194" width="112" height="12" rx="5" fill="#c3a988"/><path d="M58 206V235 M145 206V235" stroke="#bda381" stroke-width="6"/><path d="M83 186 L103 182 126 187 126 195 103 191 83 195Z" fill="#fff9e7"/>', '#f7efdb')
    scenes['attitude/respect'] = (person(219, 95, .96, True, '#aab99b', 'normal') + '<g transform="rotate(10 100 150)">' + person(101, 144, .81, False, '#d5ac8e', 'hold') + '</g>' + '<path d="M67 98 Q79 89 90 97 M66 90 Q73 83 80 86" stroke="#c1ad6f" stroke-width="3" fill="none" stroke-linecap="round"/>' + heart(164, 64, .8, '#cfbb73'), '#f6edcf')
    scenes['attitude/chatting'] = ('<g opacity=".75">' + person(249, 106, .65, True, '#a8b6a2', 'wave') + '</g>' + person(87, 145, .82, False, '#d9b392', 'wave') + person(174, 151, .77, False, '#a6b9ca', 'offer') + '<path d="M40 61Q40 43 61 43H104Q122 43 122 61V78Q122 92 103 92L87 105 87 92H58Q40 92 40 76Z" fill="#fffaf0"/><path d="M137 92Q137 75 153 75H188Q204 75 204 91V105Q204 118 188 118H174L165 129 162 118H152Q137 118 137 104Z" fill="#fffaf0"/><g fill="#c4b38c"><circle cx="63" cy="68" r="3"/><circle cx="81" cy="68" r="3"/><circle cx="99" cy="68" r="3"/><circle cx="156" cy="97" r="3"/><circle cx="172" cy="97" r="3"/><circle cx="188" cy="97" r="3"/></g>', '#f4eddb')
    for name, (content, color) in scenes.items():
        target = ROOT / 'assets' / 'images' / f'{name}.svg'
        target.parent.mkdir(parents=True, exist_ok=True)
        svg = '\n'.join(line.rstrip() for line in wrap(content, color).splitlines()) + '\n'
        target.write_text(svg, encoding='utf-8')
    logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + ''.join(f'<ellipse cx="24" cy="14" rx="7.8" ry="12" fill="#b2bf8e" transform="rotate({angle} 24 24)"/>' for angle in range(0, 360, 60)) + '<circle cx="24" cy="24" r="9" fill="#f4d786"/><circle cx="21" cy="23" r="1" fill="#73805e"/><circle cx="27" cy="23" r="1" fill="#73805e"/><path d="M21 27 Q24 30 27 27" fill="none" stroke="#73805e" stroke-width="1.2" stroke-linecap="round"/></svg>'
    (ROOT / 'assets' / 'images' / 'flower.svg').write_text(logo, encoding='utf-8')
    print(f'Created {len(scenes)} illustrations and a flower logo.')


def generate_audio():
    import lameenc  # Optional authoring tool, never imported by the website.
    sample_rate = 44100
    target = ROOT / 'assets' / 'sounds'
    target.mkdir(parents=True, exist_ok=True)
    rng = random.Random(14011)

    def firework(duration, launches):
        samples = [0.0] * int(duration * sample_rate)
        for launch in launches:
            # A soft rising whistle, followed by a low pop and falling sparkles.
            for i in range(int(1.35 * sample_rate)):
                t = i / sample_rate
                index = int(launch * sample_rate) + i
                if index >= len(samples):
                    break
                envelope = math.sin(math.pi * t / 1.35) ** 2
                samples[index] += .05 * envelope * math.sin(2 * math.pi * (600 * t + 600 * t * t))
            start = int((launch + 1.5) * sample_rate)
            low = 0.0
            for i in range(int(.7 * sample_rate)):
                index = start + i
                if index >= len(samples):
                    break
                t = i / sample_rate
                noise = rng.uniform(-1, 1)
                low = .85 * low + .15 * noise
                envelope = math.exp(-8 * t)
                samples[index] += envelope * (.26 * low + .045 * noise + .13 * math.sin(2 * math.pi * 85 * t) * math.exp(-20 * t))
            for _ in range(18):
                sparkle = start + int(rng.uniform(.08, .7) * sample_rate)
                frequency = rng.uniform(1400, 3200)
                for i in range(int(.028 * sample_rate)):
                    if sparkle + i >= len(samples):
                        break
                    t = i / sample_rate
                    samples[sparkle + i] += .035 * math.exp(-150 * t) * math.sin(2 * math.pi * frequency * t)
        return samples

    def sad_notes():
        # A descending A-minor phrase, gentle rather than a harsh error buzzer.
        samples = []
        for frequency, duration in [(440, .25), (349.23, .28), (261.63, .4)]:
            for i in range(int(duration * sample_rate)):
                t = i / sample_rate
                envelope = min(1, t / .025) * max(0, 1 - t / duration) ** 1.7
                samples.append(.2 * envelope * (math.sin(2 * math.pi * frequency * t) + .15 * math.sin(2 * math.pi * frequency * 2 * t)))
            samples.extend([0.0] * int(.045 * sample_rate))
        return samples

    tracks = {'correct': firework(2.6, [0, .25]), 'wrong': sad_notes(), 'complete': firework(3.2, [0, .2, .45, .7])}
    for name, samples in tracks.items():
        pcm = bytearray()
        gain = min(2.4, .55 / max(max(abs(sample) for sample in samples), .001))
        for sample in samples:
            pcm.extend(struct.pack('<h', round(max(-.65, min(.65, sample * gain)) * 32767)))
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(128)
        encoder.set_in_sample_rate(sample_rate)
        encoder.set_channels(1)
        encoder.set_quality(2)
        (target / f'{name}.mp3').write_bytes(encoder.encode(bytes(pcm)) + encoder.flush())
    print('Created firework celebration and gentle sad MP3 sound effects.')


if __name__ == '__main__':
    if '--audio-only' not in sys.argv:
        generate_images()
    if '--audio' in sys.argv or '--audio-only' in sys.argv:
        generate_audio()
