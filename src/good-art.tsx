import type { CSSProperties } from 'react'
import { Crown, Egg, Flame, Moon, Sparkles, Watch, WandSparkles } from 'lucide-react'
import type { ShopGood } from './shop-catalog'

const icons = {
  crown: Crown, watch: Watch, wand: WandSparkles,
  flame: Flame, moon: Moon, slime: Sparkles, egg: Egg,
}

export function GoodArt({ good }: { good: ShopGood }) {
  const Icon = icons[good.art as keyof typeof icons]
  return <span className="good-art" data-art={good.art} data-pattern={good.pattern} style={{
    '--good-primary': good.primary, '--good-secondary': good.secondary,
  } as CSSProperties} aria-hidden="true">
    <span className="good-shape">{Icon ? <Icon strokeWidth={2.2}/> : null}</span>
  </span>
}
