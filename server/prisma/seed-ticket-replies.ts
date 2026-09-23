import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { ReplyType, Role } from '@prisma/client'

const TICKET_ID = 32

async function main() {
  const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID } })
  if (!ticket) {
    throw new Error(`Ticket ${TICKET_ID} not found — seed tickets first (bun prisma/seed-tickets.ts).`)
  }

  const agent = await prisma.user.findFirst({ where: { role: Role.agent, deletedAt: null } })
  if (!agent) {
    throw new Error('No agent user found — seed an agent user first.')
  }

  const { subject, fromName } = ticket

  const messages: { senderType: ReplyType; body: string }[] = [
    {
      senderType: ReplyType.agent,
      body: [
        `Hi ${fromName}, thanks for reaching out about "${subject}".`,
        `I'm sorry to hear you're running into this — let's get it sorted out as quickly as possible.`,
        `Before I dig in, I want to confirm a few details so I can reproduce the issue on our end.`,
        `Could you tell me which browser and operating system you're using when this happens?`,
        `Also, does this happen every time, or only intermittently?`,
        `If you have a specific timestamp for when you last saw the issue, that would help me pull the relevant logs.`,
        `In the meantime, I've flagged this ticket as high priority given the impact you described.`,
        `I'll also check whether any other customers have reported something similar recently.`,
        `I'll keep you updated as soon as I have more information.`,
        `Thanks again for your patience while we look into this.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.customer,
      body: [
        `Hi, thanks for the quick reply.`,
        `I'm using Chrome on Windows 11, latest version as of this week.`,
        `It happens every single time, not just occasionally.`,
        `The last time I saw it was about twenty minutes before I opened this ticket.`,
        `I tried logging out and back in, but that didn't help.`,
        `I also tried a different browser (Firefox) and got the same result.`,
        `My account email is the one this ticket is under, in case that helps you look it up.`,
        `This is affecting my ability to get work done today, so I'd appreciate a fast turnaround.`,
        `Let me know if you need anything else from my side.`,
        `Looking forward to hearing back soon.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.agent,
      body: [
        `Thanks for the extra detail — that helps a lot.`,
        `I pulled the logs around the timestamp you gave me and I can see some irregular activity on your account.`,
        `To narrow this down further, could you record a short screen capture of the issue happening?`,
        `If a screen recording isn't easy to get, a couple of screenshots of any error messages would also help.`,
        `It would also help to know if this started after any recent change on your side, like a browser update or extension install.`,
        `I've looped in one of our engineers to take a closer look at the logs in parallel.`,
        `We take issues like this seriously, especially when they're blocking your work.`,
        `I'll follow up as soon as I hear back from the engineering team.`,
        `In the meantime, feel free to send over anything else you notice.`,
        `Thanks again for bearing with us.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.customer,
      body: [
        `Sure, I recorded a short video and I'm attaching the console output below as well.`,
        `[console] Uncaught error at approximately the same time the issue occurs`,
        `[console] Network request appears to time out after a few seconds`,
        `[console] No other errors logged before or after`,
        `I don't remember installing any new browser extensions recently.`,
        `I did notice my laptop installed a Windows update over the weekend, if that's relevant.`,
        `Nothing else on my end has changed that I can think of.`,
        `Honestly this is getting pretty frustrating since it's now been going on for most of the day.`,
        `I have a deadline tomorrow morning and really need this working before then.`,
        `Please let me know as soon as you have an update.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.agent,
      body: [
        `I completely understand the urgency, and I appreciate you sending over the console output — that was very helpful.`,
        `Based on the timeout you're seeing and the timing, it looks like this may be related to a known issue affecting a subset of accounts.`,
        `Our engineering team is actively working on a fix, but in the meantime I have a workaround you can try.`,
        `First, please clear your browser cache and cookies for our site specifically, not just a hard refresh.`,
        `Then, log back in and try the action again in a private/incognito window to rule out any cached session state.`,
        `If that still doesn't resolve it, try switching your account's default view in Settings > Preferences, which sometimes avoids the affected code path.`,
        `I know this is an extra step and I'm sorry for the inconvenience it's causing you.`,
        `I'll stay on this ticket personally until it's fully resolved.`,
        `Please let me know how the workaround goes.`,
        `I'm also going to escalate this internally given your deadline tomorrow.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.customer,
      body: [
        `Okay, I tried all three steps you suggested.`,
        `Clearing cache and cookies didn't change anything on its own.`,
        `The incognito window actually got a bit further before failing, so that's progress I guess.`,
        `Switching the default view in Settings did seem to help — I was able to complete the action once.`,
        `However, it failed again on my second attempt a few minutes later.`,
        `So it seems more reliable now but still not fully fixed.`,
        `I can work around it for now by retrying a couple of times if needed.`,
        `That said, I'd still like to know when the actual fix will be deployed.`,
        `Do you have any estimate on timing?`,
        `Thanks for staying on top of this.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.agent,
      body: [
        `Thanks for testing that out and for the clear description of what worked and what didn't — it lines up with what engineering is seeing.`,
        `I just heard back from the team and they've identified the root cause.`,
        `It's related to a race condition that occurs under certain network conditions, which explains the intermittent behavior you're seeing.`,
        `A fix has already been written and is going through our staging environment for testing right now.`,
        `Based on our current release schedule, we expect this to be deployed to production within the next 24 hours.`,
        `I'll personally make sure this ticket gets updated the moment the fix goes live.`,
        `In the meantime, please continue using the workaround from my last message if you hit the issue again.`,
        `I've also noted your deadline internally so the team is aware of the urgency.`,
        `I really appreciate your patience while we work through this.`,
        `I'll be in touch again very soon with an update.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.customer,
      body: [
        `Thanks for the update, that's reassuring to hear.`,
        `I managed to get through my most urgent tasks today using the workaround, so the immediate pressure is off.`,
        `I still have ongoing work that depends on this being fully fixed though.`,
        `Could you confirm once the fix is actually live rather than just deployed?`,
        `I'd like to do a final check on my end before considering this closed.`,
        `Also, out of curiosity, will this fix apply retroactively to any data that might have been affected while the bug was active?`,
        `I want to make sure nothing was lost or corrupted during the time this was broken.`,
        `Let me know if you need anything further from me for verification.`,
        `Otherwise I'll keep an eye out for your next message.`,
        `Thanks again for the thorough communication throughout this.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.agent,
      body: [
        `Great question, and good news on both fronts.`,
        `The fix has now been deployed to production as of this morning, ahead of the original estimate.`,
        `I just tested the exact steps you described on my end and everything completed successfully without needing the workaround.`,
        `Our engineering team also confirmed that no data was lost or corrupted during the period this issue was active — the failures happened before any data was written, so nothing was left in a bad state.`,
        `Could you try the action once more on your end, ideally without the workaround this time, just to confirm everything looks good from your side too?`,
        `If you still see any strange behavior, please send it over right away and we'll jump back on it immediately.`,
        `Otherwise, I'll plan to mark this ticket as resolved once I hear back from you.`,
        `Thanks so much for your detailed reports throughout this process — they made it much easier for the team to track down.`,
        `I'll keep monitoring for a bit longer just to be safe.`,
        `Let me know how the final check goes.`,
      ].join('\n'),
    },
    {
      senderType: ReplyType.customer,
      body: [
        `Just tested it several times without the workaround and everything is working perfectly now.`,
        `No errors in the console, no timeouts, and it's noticeably faster too.`,
        `I really appreciate how quickly this was investigated and fixed, especially given my deadline.`,
        `The communication throughout was great — I always knew what was happening and what to expect next.`,
        `Good to hear no data was affected, that was my main concern.`,
        `I'll reach back out if anything comes up again, but for now this looks fully resolved.`,
        `Please pass along my thanks to the engineering team as well.`,
        `You can go ahead and close this ticket.`,
        `Thanks again for all the help.`,
        `Have a great rest of your week.`,
      ].join('\n'),
    },
  ]

  const now = Date.now()
  const data = messages.map((message, index) => ({
    ticketId: ticket.id,
    senderType: message.senderType,
    authorId: message.senderType === ReplyType.agent ? agent.id : null,
    body: message.body,
    // Space replies 30 minutes apart, in order, ending just now.
    createdAt: new Date(now - (messages.length - 1 - index) * 30 * 60 * 1000),
  }))

  const result = await prisma.ticketReply.createMany({ data })
  console.log(`Created ${result.count} replies on ticket ${TICKET_ID} ("${subject}").`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
