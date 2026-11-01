require('dotenv').config(); // .env dosyasını aktif eder

const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const http = require('http');

// Render uyku modunu önlemek için basit web sunucusu
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot aktif ve calisiyor!\n');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.MessageContent
  ]
});

// ================= KONFİGÜRASYON (.env dosyasından çekilir) =================
const CONFIG = {
  TOKEN: process.env.TOKEN,
  WELCOME_CHANNEL_ID: process.env.WELCOME_CHANNEL_ID,
  VOICE_TEYIT_CHANNEL_ID: process.env.VOICE_TEYIT_CHANNEL_ID, 
  STAFF_NOTIFY_CHANNEL_ID: process.env.STAFF_NOTIFY_CHANNEL_ID, 
  AUTHORIZED_ROLE_IDS: process.env.AUTHORIZED_ROLE_IDS ? process.env.AUTHORIZED_ROLE_IDS.split(',') : [], 
  STAFF_ROLE_MENTION_ID: process.env.STAFF_ROLE_MENTION_ID, 
  REGISTERED_ROLE_ID: process.env.REGISTERED_ROLE_ID, 
  FEMALE_ROLE_ID: process.env.FEMALE_ROLE_ID 
};

// ================= 1. YENİ ÜYE KATILIMI =================
client.on('guildMemberAdd', async (member) => {
  try {
    await member.setNickname('İsim | Yaş').catch(() => {});
  } catch (err) {}

  const channel = member.guild.channels.cache.get(CONFIG.WELCOME_CHANNEL_ID);
  if (!channel) return;

  const totalMembers = member.guild.memberCount;
  const createdAtFormatted = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:f>`;

  const welcomeContent = 
`**S E F İ R** <a:safir_tag_beyaz:1565730491968135279>

<a:safir_rgb_ok:1565730369683193866> Merhabalar ${member}, **${member.guild.name}** sunucumuza hoşgeldin. Seninle beraber sunucumuz **${totalMembers}** üye sayısına ulaştı. 

<a:safir_tag:1565730513350697010> Sunucuya erişebilmek için 🔊 https://canary.discord.com/channels/1565728076774768773/1565733707367719133 odalarında kayıt olup ismini belirtmen gerekmektedir!
#kurallar kurallar kanalından sunucu kurallarımızı okumayı ihmal etme!

<a:safir_tag:1565730513350697010> Sunucumuza **Özel URL** tarafından davet edildin Hoşgeldin

<a:safir_uyar_unlem:1565730417506525274> Hesabın ${createdAtFormatted}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`call_staff_${member.id}`)
      .setLabel('Yetkili Çağır')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🛠️'),
    new ButtonBuilder()
      .setCustomId(`names_${member.id}`)
      .setLabel('İsimler')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
    new ButtonBuilder()
      .setCustomId(`sicil_${member.id}`)
      .setLabel('Sicil')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔮')
  );

  await channel.send({
    content: welcomeContent,
    components: [row]
  });
});

// ================= 2. KAYIT SİSTEMİ KOMUTU (.k ID İsim Yaş Cinsiyet) =================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.startsWith('.k')) {
    const hasRole = message.member.roles.cache.some(r => CONFIG.AUTHORIZED_ROLE_IDS.includes(r.id));
    if (!hasRole && !message.member.permissions.has('Administrator')) {
      return message.reply('❌ Bu komutu yalnızca yetkililer kullanabilir!');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 3) {
      return message.reply('⚠️ Eksik argüman! Örnek: `.k @Kullanici Yiğit 18 e` veya `.k @Kullanici Zeynep 19 k`');
    }

    const targetInput = args[0];
    const targetId = targetInput.replace(/<@!?&?(\d+)>/, '$1');
    const member = await message.guild.members.fetch(targetId).catch(() => null);

    if (!member) {
      return message.reply('❌ Belirtilen sunucuda bu ID/etikete sahip üye bulunamadı!');
    }

    // ID kısmı atılarak temiz argümanlar alınıyor ([İsim, Yaş, Cinsiyet])
    const cleanArgs = args.slice(1);

    const genderArg = cleanArgs.pop().toLowerCase(); 
    const ageArg = cleanArgs.pop(); 
    const nameArg = cleanArgs.join(' '); 

    if (!ageArg || isNaN(ageArg)) {
      return message.reply('⚠️ Lütfen geçerli bir yaş belirtin!');
    }

    let genderText = '';
    let isFemale = false;

    if (['e', 'erkek', 'bey'].includes(genderArg)) {
      genderText = 'Erkek';
      isFemale = false;
    } else if (['k', 'kadın', 'bayan', 'kiz', 'kız'].includes(genderArg)) {
      genderText = 'Kadın';
      isFemale = true;
    } else {
      return message.reply('⚠️ Cinsiyeti yanlış girdiniz! Komutun sonuna **e** (Erkek) veya **k** (Kadın) yazmalısınız.');
    }

    const newNickname = `${nameArg} | ${ageArg}`;

    try {
      await member.setNickname(newNickname);

      if (CONFIG.REGISTERED_ROLE_ID) {
        await member.roles.add(CONFIG.REGISTERED_ROLE_ID).catch(() => {});
      }

      if (isFemale && CONFIG.FEMALE_ROLE_ID) {
        await member.roles.add(CONFIG.FEMALE_ROLE_ID).catch(() => {});
      }

      const successEmbed = new EmbedBuilder()
        .setColor(isFemale ? '#FFB6C1' : '#5865F2')
        .setDescription(
          `<@${member.id}> kişisinin adı **${newNickname}** olarak değiştirildi. 🔄\n\n` +
          `**${genderText}** Olarak kaydedildi! ✅\n\n` +
          `⬛ **Kayıt işlemi başarıyla tamamlandı.**`
        );

      return message.channel.send({ embeds: [successEmbed] });
    } catch (err) {
      return message.reply('❌ İşlem başarısız! Botun rolü, kayıt edilecek kişinin rolünden üstte olmalıdır.');
    }
  }
});

// ================= 3. BUTON ETKİLEŞİMLERİ =================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  const targetUserId = customId.split('_')[2];

  if (customId.startsWith('call_staff_')) {
    const member = interaction.member;

    if (!member.voice.channel || member.voice.channel.id !== CONFIG.VOICE_TEYIT_CHANNEL_ID) {
      return interaction.reply({
        content: `⚠️ Yetkili çağırabilmek için lütfen <#${CONFIG.VOICE_TEYIT_CHANNEL_ID}> ses kanalında bulunun!`,
        ephemeral: true
      });
    }

    const staffChannel = interaction.guild.channels.cache.get(CONFIG.STAFF_NOTIFY_CHANNEL_ID);
    if (staffChannel) {
      staffChannel.send({
        content: `<@&${CONFIG.STAFF_ROLE_MENTION_ID}>, ${interaction.user} kullanıcısı <#${member.voice.channel.id}> ses kanalında yetkili bekliyor!`
      });
    }

    return interaction.reply({
      content: '✅ Yetkililere bildirim gönderildi, en kısa sürede ilgilenecekler.',
      ephemeral: true
    });
  }

  if (customId.startsWith('sicil_')) {
    const hasRole = interaction.member.roles.cache.some(r => CONFIG.AUTHORIZED_ROLE_IDS.includes(r.id));
    
    if (!hasRole && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ Bu butonu ve sicil bilgilerini yalnızca yetkililer görüntüleyebilir!',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      return interaction.editReply({ content: 'Kullanıcı bulunamadı.' });
    }

    let isBannedBefore = 'Hayır / Kayıt Yok';
    try {
      const banInfo = await interaction.guild.bans.fetch(targetUser.id).catch(() => null);
      if (banInfo) {
        isBannedBefore = `Evet (Sebep: ${banInfo.reason || 'Belirtilmemiş'})`;
      }
    } catch (err) {
      isBannedBefore = 'Sorgulanamadı';
    }

    const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
    
    const sicilEmbed = new EmbedBuilder()
      .setTitle(`📋 Kullanıcı Sicil Bilgisi: ${targetUser.tag}`)
      .setColor('#5865F2')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
        { name: '📅 Birlikte Katılım / Hesap Açılış', value: `<t:${createdTimestamp}:R> (<t:${createdTimestamp}:F>)`, inline: false },
        { name: '🚫 Sunucuda Banlı mı?', value: `${isBannedBefore}`, inline: false }
      )
      .setFooter({ text: `${interaction.guild.name} Güvenlik Sistemi`, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    return interaction.editReply({ embeds: [sicilEmbed] });
  }

  if (customId.startsWith('names_')) {
    return interaction.reply({
      content: 'ℹ️ Bu kullanıcının geçmiş isim geçmişi bulunmuyor.',
      ephemeral: true
    });
  }
});

client.login(CONFIG.TOKEN);
