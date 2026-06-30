## class コーチング記録(これが主役ルート)

props:
member_id
Iコーチング[]

## inserface Iコーチング
props: 
ID, 実施日、担当コーチ、

fun create()
fun edit(
　編集先クラスの::create: (
自分を除いたコーチング記録, 必要なProps：T
) -> {}
)

### 具体
###### 教材選定class
選定した教材リスト
    選定教材ID、目標分、メモ
共有事項

override fun create(必要なProps：Tとコーチング記録) -> すでに教材選定あったらNG

###### オリエンテーションclass
この1ヶ月間の振り返り？
コーチからのアドバイス？
その他質問・補足？
override fun create(必要なProps：Tとコーチング記録) -> すでにオリエンあったらNG
###### コーチングclass
何回めか（1,2,3みたいな）
実施テスト内容リスト
    教材ID、範囲、形式、点数、備考、次回ステータス（継続、卒業）？
未実施内容リスト
    教材ID
未選択教材リスト
    教材ID
この1ヶ月間の振り返り？
コーチからのアドバイス？
その他質問・補足？

override fun create(必要なProps：Tとコーチング記録) -> オリエンなかったらNG、1回目がない場合は2回目いこう作成NG

###### その他class
この1ヶ月間の振り返り？
コーチからのアドバイス？
その他質問・補足？

override fun create(必要なProps：Tとコーチング記録)