const config = {
  darkMode: ['class'],
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: {
          DEFAULT: "hsl(var(--input))",
          invalid: "hsl(var(--input-invalid))",
        },
        ring: {
          DEFAULT: "hsl(var(--ring))",
          invalid: "hsl(var(--foreground-destructive))",
        },
        background: 'hsl(var(--background))',
         foreground: {
          DEFAULT: "hsl(var(--foreground))",
          destructive: "hsl(var(--foreground-destructive))",
        },
        active: 'hsl(var(--active))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
        
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
         sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
       borderColor: {
        DEFAULT: "hsl(var(--border))",
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
         "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      typography: {
        DEFAULT: {
          css: {
            'h2, h3, h4, h5, ul, ol': {
              'margin-top': '1em',
              'margin-bottom': '0.6em',
            },
            'p, pre, blockquote': {
              'margin-top': '0.6em',
              'margin-bottom': '0.6em',
            },
            li: {
              'margin-top': '0px',
              'margin-bottom': '0px',
            },
            'li > p, li > ul, li > ol ': {
              'margin-top': '0px',
              'margin-bottom': '0px',
            },
            hr: {
              'margin-top': '1em',
              'margin-bottom': '1em',
            },
            img: {
              'margin-top': '0.6em',
              'margin-bottom': '0.6em',
            },
            table: {
              'margin-top': '1em',
              'margin-bottom': '1em',
            },
            'ul>li::marker': {
              color: 'var(--tw-prose-body);',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            code: {
              'background-color': 'var(--tw-prose-pre-bg)',
              color: 'var(--tw-prose-pre-code)',
              padding: '0.125em 0.25em',
              margin: '0 0.25em',
              'border-radius': '0.25em',
              'font-weight': 'normal',
            },
            '--tw-prose-invert-pre-bg': 'rgb(255 255 255 / 0.1)',
          },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
