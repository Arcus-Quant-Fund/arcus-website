import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-grid pt-24 px-6 relative overflow-hidden">
      <div className="glow-orb-gold" style={{ top: "-200px", right: "-100px" }} />
      <div className="glow-orb-blue" style={{ bottom: "400px", left: "-200px" }} />
      <div className="max-w-3xl mx-auto relative">

        {/* Header */}
        <div className="mb-16 animate-in">
          <p className="text-gold text-sm font-semibold tracking-widest uppercase mb-4">Founder Story</p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
            The Trade That<br />
            <span className="gradient-text">Built Everything</span>
          </h1>
        </div>

        {/* Photo + intro */}
        <div className="animate-in animate-delay-1 flex items-start gap-8 mb-16">
          <div className="flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden">
            <Image
              src="/founder.webp"
              alt="Shehzad Ahmed"
              width={112}
              height={112}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Shehzad Ahmed</h2>
            <p className="text-gold text-sm font-medium mb-3">Founder & CEO · Arcus Quant Fund</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              BBA Finance, CS Minor (Big Data & HPC) · IUB Bangladesh ·
              Quantitative Trader · Systems Builder · 18+ months live trading
            </p>
          </div>
        </div>

        {/* Story body */}
        <div className="animate-in prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed text-[17px]">

          <p>
            My father was a stockbroker. Before I could make sense of most subjects at school,
            I understood how markets moved — bid-ask spreads before algebra, position sizing
            before physics. By fifteen I was placing trades through his account. Not because
            anyone asked. Because markets felt honest in a way most things didn&apos;t.
            You were either right or you were wrong. You found out quickly.
          </p>

          <p>
            My family carries a different kind of builder too. My father&apos;s maternal uncle
            founded BACE — Bangladesh Association for Community Education — in 1977.
            Vocational training, girls&apos; scholarships, community schools, microfinance.
            Active across seven districts, more than five hundred villages. Nearly fifty years
            of continuous operation. He built it as a system: structured, self-sustaining,
            designed to generate revenue and deploy it for social good without depending on
            any one person to keep it alive. After he passed, BACE kept running.
            It is our family&apos;s institution. It is not what it once was — the family&apos;s
            involvement has thinned over the years, and organisations fade when the people
            who built them are no longer there to drive them. But it still runs. My father
            still travels to remote villages to oversee projects. People are still being
            helped. The structure held even when the energy behind it didn&apos;t.
          </p>

          <p>
            That is what I grew up watching. And the purpose behind it was never explained
            to me as a lesson. It was just the air I breathed. Helping people was not
            something I chose. It was something I inherited before I was old enough
            to have a choice.
          </p>

          <p>
            My great-uncle — the man who built BACE — has been my idol. Not for anything
            flashy. For the simplest thing: he identified a problem his community had,
            built something to fix it, and made it sturdy enough to outlast him.
            That is who I wanted to be when I grew up. Not wealthy. Impactful.
            I did not know what form it would take — I just knew I wanted to follow
            that example.
          </p>

          <p>
            I did not fully understand what it was teaching me until much later.
            A system that outlives its founder. That does what it was designed to do,
            without anyone watching. That is what he showed me. And without knowing it,
            that is exactly what I have been building ever since.
          </p>

          <p>
            I grew up moving between different kinds of rooms — lecture halls, boardrooms,
            trading floors, mosques, NGO offices, family business offices. I was never
            performing in any of them.
            That is just the shape of the life I had. And the thing about being genuinely
            comfortable in most rooms is that you stop needing any of them to validate you.
            You can just get on with the work.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">The Trade</h2>

          <p>
            In January 2026, I made the largest trade of my life. A leveraged position on silver
            perpetual futures — most of my net worth. I had spent weeks building the thesis:
            the US was executing a coordinated resource nationalism strategy across Venezuela,
            rare earths, and semiconductors. China was restricting silver exports. The dollar
            was being used as a weapon, printing value that eroded every reserve in the world
            that wasn&apos;t American. Silver was the convergence point. My models said
            85–90% probability of success. Expected return: over 1,000%.
          </p>

          <p>
            The thesis was right. The trade was not.
          </p>

          <p>
            Silver crashed 30% without warning. My position was liquidated.
            I lost most of what I had built.
          </p>

          <p>
            That night I made a vow: I would never place a manual trade again.
          </p>

          <p>
            I do not regret it. Not because I am comfortable with loss — but because
            the bet was real. I was not gambling. I was taking a position against a system
            I understood deeply and believed — still believe — is structurally extractive.
            When you grow up in Bangladesh, you understand what it means when the reserve
            currency prints and your savings quietly shrink. The fiat system is not neutral.
            It is a mechanism — and not everyone benefits from it equally.
            I wanted to profit from its decline. Instead, I got an education.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">What the Loss Settled</h2>

          <p>
            The honest version: I already knew how to build a system. I had already taught
            myself Python, built backtesting engines from scratch, run thousands of simulations,
            and constructed the full stack — data infrastructure, optimization engine,
            walk-forward validation, cloud deployment, monitoring dashboard. I had done all of it.
          </p>

          <p>
            What I did not do was use it for the silver trade.
          </p>

          <p>
            The thesis felt so clear, so well-researched, so obviously right — that I got lazy.
            Setting up a proper bot means months of analysis, simulation, optimization.
            It means running the process all the way through before touching real capital.
            I skipped it. I traded manually. I told myself the conviction was enough.
          </p>

          <p>
            It was not.
          </p>

          <p>
            The silver loss did not teach me how to build systems. It taught me that I already
            knew — and that cutting the process short, even once, for even the strongest thesis,
            is how you lose everything. The vow was not to learn something new.
            It was to never again pretend I could afford to be lazy about what I already knew.
          </p>

          <p>
            Most people who say they &quot;trade algorithmically&quot; mean they run someone
            else&apos;s indicator. I mean every layer built by hand, every parameter validated,
            every edge stress-tested before deployment. That standard existed before the loss.
            After the loss, it became non-negotiable.
          </p>

          <p>
            Finding the alpha felt like a miracle — not the kind that falls from the sky, but
            the kind that reveals itself through enough honest work. The directional change
            framework had academic backing I could verify. The walk-forward results held.
            Monte Carlo told me to expect a maximum drawdown of 15–20%. I deployed real
            capital and waited to see if the model was honest about itself.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">October 2025</h2>

          <p>
            To understand what happened in October 2025, you need the context of the year
            before it. For most of 2025, crypto was already in a slow bleed — what analysts
            called one long bear market. XRP, the asset my bot trades, peaked at $3.40 in
            mid-2025 and spent the rest of the year falling. By year end it was near $1.88.
            Nearly fifty percent gone from its high. Across that entire period — while the
            underlying asset lost half its value — the bot kept making money.
          </p>

          <p>
            Then came October 10th.
          </p>

          <p>
            Trump announced 100% tariffs on China. Within 24 hours, $19.37 billion in
            crypto positions were liquidated. 1.6 million traders were wiped out in a single
            day. Bitcoin fell 18% from its all-time high of $126,000. XRP and altcoins
            dropped 60–80%. Yahoo Finance called it &quot;the most cursed month in crypto
            history.&quot; CoinGecko documented it as the single largest liquidation event
            ever recorded.
          </p>

          <p>
            At 2:39 AM on October 12th, my stop-loss triggered at −17.41%.
          </p>

          <p>
            I was asleep.
          </p>

          <p>
            The system exited. No hesitation, no &quot;maybe it comes back,&quot; no one
            watching a screen at 2 AM hoping for a reversal. The rules executed.
            Two days later, the system re-entered on its own. I finished October with a
            profitable month — five trades, net positive.
          </p>

          <p>
            That is the point of building a system rather than trading with conviction.
            I do not follow individual trades. Most days I am entirely unaware the bot
            has done anything until I check the balance. I know exactly how it behaves
            in every market condition — I built it, I know every parameter, I can simulate
            in my head what it would do in any scenario — but I do not need to watch it.
            That is not ignorance. That is trust earned through construction.
          </p>

          <p>
            The model had predicted 15–20% maximum drawdown. The actual figure was 17.41%.
            The underlying asset lost fifty percent of its value across the year. The bot
            finished profitable. The difference between that and the silver trade was not
            intelligence or courage. It was the presence of a system that did not care
            what I believed — and did not need me to be awake.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">The Blessing I Did Not Earn</h2>

          <p>
            Most mornings I wake up and the bots have made money. It is not a small feeling.
            It feels — genuinely — like something given to me, not something I produced.
            I did the work to build it, but the alpha itself? The way it keeps finding signal
            in markets that wipe everyone else out? That part feels like grace. Like something
            flowing through me rather than from me.
          </p>

          <p>
            I have thought about why that is. And I keep coming back to a Friday afternoon
            on a road trip through the Bangladeshi countryside. We pulled over at a small
            roadside mosque for Jumu&apos;ah. I stepped out of the car — denim jacket,
            Ray-Ban sunglasses — and there they were. Madrasa boys sitting on the steps.
            Thirteen, fourteen years old. White thobes. Worn sandals.
          </p>

          <p>
            They looked at me. And I could see it clearly — not admiration, not curiosity.
            Something closer to the question: <em>why him and not me?</em>
          </p>

          <p>
            That look has never left me. Because it was the right question. I had no answer
            for it. I still don&apos;t. I stepped out of that car in sunglasses and they were
            sitting on mosque steps — and the only difference between us was where we were
            born and who our parents were. They did not choose their circumstances any more
            than I chose mine. They were not less disciplined. They were not less sharp.
            The madrasa boys who memorise entire texts with rigour I rarely see in university
            classrooms — they were burdened with their own greatness. I was burdened with mine.
            The difference was access. That is all it ever is.
          </p>

          <p>
            The school I attended. The language I learned to move in. The father who spoke
            to me about markets before I could read a balance sheet. None of it earned.
            All of it given.
          </p>

          <p>
            I had grown up watching what access does for someone who already has the will —
            I had seen it my whole life through BACE. The will was never the problem.
            The access was always the problem.
          </p>

          <p>
            And so the question that has driven everything since is not <em>what can I build</em>,
            but <em>what am I responsible for building</em> with what I have been given.
          </p>

          <p>
            Those boys are burdened with their own greatness — the same way I am burdened
            with mine. They carry the weight of memorisation, discipline, spiritual depth
            that most people will never touch. I carry the weight of access, tools,
            and a set of gifts I did not ask for and cannot put down.
            Neither burden is heavier. Neither gift is more important.
            We are just each responsible for what we were given.
            That is all any of us can be.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">The Halal Problem</h2>

          <p>
            The bots use margin. Leveraged trading. Every time someone sees how much I am
            making, their first question is: <em>is this halal?</em>
          </p>

          <p>
            I have to pause. Explain the leverage. Explain that without large capital,
            leverage is what makes the returns meaningful. It is an honest answer and an
            uncomfortable one — because the question underneath it is one I have carried
            since I first studied finance. The risk-free rate sits at the heart of everything
            Western finance teaches. Every valuation, every pricing model, every instrument.
            And for a Muslim, the risk-free rate is riba. Interest. Forbidden.
          </p>

          <p>
            I was always taught a system built around something I could not fully accept.
            I always believed there was a way to reconstruct these instruments — the same
            mathematical elegance, the same economic function — without the interest component.
            That the problem was not finance. It was the assumption buried inside it.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">Where Baraka Came From</h2>

          <p>
            There is a particular kind of luck that comes from being in the right classroom.
            Dr. Rubaiyat was not a typical academic. He had worked as a cryptoeconomist at
            Sifchain — a DeFi protocol out of San Francisco — designing tokenomics, modelling
            on-chain incentive systems, operating inside real Web3 infrastructure. That is not
            the kind of practitioner knowledge you find in a university in this part of the world.
            He was a gem who should not, by any reasonable calculation, have been here.
            And yet there he was.
          </p>

          <p>
            He introduced me to DeFi protocols. On-chain finance. Smart contracts that execute
            without counterparty trust. We even worked together on DEX/CEX research — a paper
            we submitted to Finance Research Letters. I looked at those systems and saw
            immediately what they could become: financial infrastructure built from mathematics,
            not from institutional permission — and restructurable, at the protocol level,
            to remove interest entirely.
          </p>

          <p>
            What followed felt less like research and more like discovery. The more I studied
            the problem of Islamic finance — 1.8 billion people locked out of perpetual futures
            markets, a $3 trillion industry with no access to the instruments that generate
            real yield — the more clearly I could see the solution. The mathematics already
            existed. Ackerer, Hugonnier and Jermann had published a framework in 2024 that,
            at the parameter ι=0 — interest set to zero — produced a fully functional
            perpetual futures mechanism with no riba embedded anywhere.
          </p>

          <p>
            It flowed. That is the only word for it. Each discovery led to the next.
            The mechanism, the funding formula, the Shariah compliance structure,
            the research papers. Six papers. All of it came together as if I was not
            inventing something but uncovering it.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">The Partnership I Did Not Plan</h2>

          <p>
            I went to see the head of IUB&apos;s Finance department to discuss one of my research papers.
            He introduced me to a professor who had just joined — newly arrived from the United
            States. Dr. Rafiq Bhuyan. Fulbright Scholar. Author of 80+ peer-reviewed papers.
            Former Purcell Chair Professor at Le Moyne College, New York. Former faculty at
            California State University, the American University of Kuwait, UC Riverside,
            Northeastern, USC, UC Davis. PhD in Economics from Concordia University Montreal.
            MS in Finance from the University of Illinois. A man who had managed a private fund
            trading stocks and options for decades.
          </p>

          <p>
            He saw what I was building. The bots. The infrastructure. The research.
          </p>

          <p>
            Before I had finished explaining — before I had pitched anything, told any story,
            or made any case — he said he wanted to be my co-founder. He offered to put
            $50,000 of his own capital into my system to manage. He laid out the plan himself:
            register in Dubai and the United States, handle the LLC formation and traditional
            finance infrastructure on his side, let me run the computational side.
            He said he had ideas for strategies he believed we could turn into additional bots.
          </p>

          <p>
            He proposed all of this without hearing my plans. The work was the pitch.
          </p>

          <p>
            The pattern kept repeating: people with real knowledge, real industry experience,
            real skin in the game — people who had no statistical reason to be in Bangladesh —
            kept arriving at exactly the right moment. I stopped calling it coincidence
            after a while.
          </p>

          <p>
            Some things you plan. Some things arrive.
          </p>

          <h2 className="text-white text-2xl font-black mt-12 mb-4">What We Are Building</h2>

          <p>
            Web3 is becoming the infrastructure layer of global finance. Every transaction,
            every instrument, every settlement — eventually on-chain. And when that happens,
            Muslims will face a choice: participate in systems built on interest, or have
            nothing. We are building the alternative. Baraka: the world&apos;s first
            Shariah-compliant perpetual futures protocol, grounded in peer-reviewed
            mathematics, deployed on-chain, with zero interest hardcoded at the protocol level.
            Not a fatwa layered on top of a conventional system. Built from first principles.
          </p>

          <p>
            Alongside it, Arcus Quant Fund manages capital systematically — the same rigor,
            the same accountability — for clients who want returns without the noise.
            We are moving the bots to dYdX and D8X: protocols that operate at zero funding
            interest, closing the last gap on the halal question.
          </p>

          <p>
            I am twenty-five. I lost most of my net worth on a trade I believed in.
            I built the system anyway. I found the alpha anyway. I found the partner,
            the protocol, the mission — all of it arrived, in sequence, as if it was
            always going to.
          </p>

          <p>
            I do not know what to call that except what it is.
          </p>

          <p className="text-white font-semibold">
            Now we build in public.
          </p>

        </div>

        {/* CTA */}
        <div className="animate-in mt-20 bg-gold/10 border border-gold/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-black text-white mb-3">Work With Us</h3>
          <p className="text-gray-400 mb-6">
            Standard minimum $6,000 — or start with a $1,000 seven-month pilot to verify
            returns before committing more.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-black font-semibold rounded-xl transition-all hover:shadow-[0_6px_24px_rgba(248,172,7,0.35)] hover:-translate-y-0.5"
            >
              Get in Touch <ArrowRight size={16} />
            </Link>
            <Link
              href="/track-record"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold rounded-xl transition-colors"
            >
              View Track Record
            </Link>
          </div>
        </div>

        <div className="mt-10 mb-16 text-center">
          <Link href="/about" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to About
          </Link>
        </div>

      </div>
    </div>
  );
}
